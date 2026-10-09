import { defineProvider, presets } from "@shared/core";

/**
 * Kling (klingai.com, global region) — AI video generation, ported from
 * monid-services `adaptors/kling/*`.
 *
 * Kling is "one path per model": every endpoint submits to its own
 * `POST /<family>/<model>` and polls the SHARED `GET /tasks?task_ids=`, so
 * the whole task lifecycle lives ONCE here and each endpoint reduces to
 * data: meta + notes + its create-task path + its input schema + its rate
 * card. Ported 1:1 from v1's `makeKlingStart` / `makeKlingPoll`:
 *   - start: POST the create-task request. A non-2xx is DATA (COMPLETED,
 *     zero-billed by the engine); a 2xx whose envelope `code` is not 0 is an
 *     upstream error dressed as success and settles as a synthesized 502
 *     (design D6); a clean 2xx without `data.id` is a contract violation
 *     (deterministic throw); else park with the task id as `externalRunId`.
 *   - poll: GET the task. A non-2xx on OUR GET THROWS (design D7, the
 *     bytedance posture) — the task is very likely still running, and Kling
 *     bills the generation whether or not we keep asking. Terminal task
 *     failures DO settle: `failed` synthesizes 500, `succeeded` without a
 *     video url synthesizes 502, both zero-billed. Any other status is still
 *     in flight (`runMs` bounds it).
 *   - no stop: Kling exposes no cancel (v1 `stoppable: false`). We do not
 *     advertise what we cannot honor.
 *
 * NO `lifecycle.state` schema: the task id rides the first-class
 * `externalRunId` and the task status rides `stage`. v1 stashed the price
 * coordinates at submit; here the evidence fns read the REQUEST (design D5).
 *
 * NOTE (idempotency): Kling documents `options.external_task_id` as a
 * caller-side handle but no dedupe on it, and hook fns have no run id to
 * derive one from — a host-side retry of the start tick could double-submit.
 * Carried over from v1 as a known gap.
 */
export default defineProvider({
    name: "kling",
    meta: {
        displayName: "Kling",
        summary:
            "AI video generation with the Kling model family — text-to-video, image-to-video, multimodal editing, and motion transfer.",
        description: "AI video generation with the Kling model family — " +
            "text-to-video and image-to-video (Kling 3.0, 3.0 Turbo, 2.6, " +
            "2.5 Turbo), multimodal generation and editing from reference " +
            "images and videos (3.0 Omni, O1), and motion transfer from a " +
            "reference clip. Strengths: native synchronized audio, native " +
            "4K, six-shot storyboards in one clip, free-form 3-15 s " +
            "durations, motion control. Limits: per-second pricing that " +
            "climbs steeply at 4K (3 units/s), output links expire after " +
            "30 days, generation is asynchronous (1-5 minutes) with no " +
            "cancel, and content-policy rejections fail the run.",
        homepageUrl: "https://kling.ai",
        docsUrl: "https://kling.ai/document-api",
        categories: ["video-generation"],
        /** Caveats true of EVERY Kling video endpoint (v1's shared `notes`).
         *  Endpoint notes concatenate after these, so a model only states
         *  what diverges. */
        notes: [
            "Generation is asynchronous and typically takes 1-5 minutes " +
            "(4K and 15-second clips take longer) — poll the run rather " +
            "than blocking on it.",
            "The completed run returns outputs[].url (MP4) — the link " +
            "EXPIRES after 30 days, download promptly.",
            "Media URLs must be public https:// URLs that Kling can fetch " +
            "server-side; inline base64 is not accepted.",
            "Billing is per whole second at the rate the request selects " +
            "(resolution, native audio, video input) — a 3.041 s output " +
            "bills 3 s. Rejected requests and failed tasks cost nothing.",
            "There is no cancel: a submitted task runs to completion and " +
            "is billed even if the run is abandoned.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api-singapore.klingai.com" },
    // mirrors the `timeouts` every v1 kling def overrides (design D10):
    // 30s per HTTP call, 30min per run (a 4K 15-second clip runs several
    // minutes), poll every 10s.
    timeouts: { requestMs: 30_000, runMs: 1_800_000, pollMs: 10_000 },
    lifecycle: {
        start: async ({ utils, logger }) => {
            // the DEFAULT RELAY: method/url/headers from the compiled
            // request, body from the caller input — the body IS Kling's
            // wire shape (design D2), nothing to assemble
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                // Kling API error (validation 1201, quota 1102, rate limit
                // 1303, ...) — no task was created, nothing will be billed:
                // DATA. Kling documents every error code as a non-2xx.
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            // Kling's envelope: ONLY `code: 0` is success. A 2xx carrying a
            // non-zero code is an upstream error dressed as success; an
            // absent or unreadable code is a malformed 200, not a good one
            // (the minimax D3 strictness — v1 was permissive here).
            const code = utils.json.optionalNum(res.body, "$.code");
            if (code !== 0) {
                logger.warn(
                    "kling submit answered 2xx with a non-zero code — synthesizing 502",
                    { code: code ?? null },
                );
                return {
                    kind: "COMPLETED",
                    // OURS synthesized (the REQUEST failed) / THEIRS was a
                    // 2xx (the exchange itself succeeded) — design D12
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            const taskId = utils.json.optionalGet(res.body, "$.data.id");
            if (typeof taskId !== "string" || taskId === "") {
                // clean envelope with no id: Kling violated its own contract.
                // Deterministic — retrying cannot fix it.
                throw Object.assign(
                    new Error("Kling submit returned no task id"),
                    { retriable: false },
                );
            }
            logger.debug("kling task submitted", { taskId });
            return { kind: "RUNNING", state: { externalRunId: taskId } };
        },
        poll: async ({ data, utils, logger }) => {
            const runId = data.lifecycle.state.externalRunId;
            if (runId === undefined) {
                // corrupted thread state — deterministic, never retriable
                throw Object.assign(
                    new Error("kling poll without externalRunId in state"),
                    { retriable: false },
                );
            }
            // the BATCH query shape: `data[]`, one task per requested id
            const res = await utils.http({
                method: "GET",
                path: "/tasks",
                queryParams: { task_ids: runId },
            });
            if (res.status < 200 || res.status >= 300) {
                // design D7: OUR poll GET failed while the task is very likely
                // still generating — and billing. Throw (retriable) rather
                // than settle, so a transient blip does not abandon a video
                // we are paying for.
                throw new Error(
                    "Kling task query returned " + String(res.status),
                );
            }
            const task = utils.json.optionalGet(res.body, "$.data[0]");
            if (
                task === undefined || task === null ||
                typeof task !== "object" ||
                Array.isArray(task)
            ) {
                // a 2xx batch without our task: the task exists upstream and
                // may be billing, so this is the same posture as a failed
                // GET — keep asking, `runMs` bounds it (design D7).
                throw new Error(
                    "Kling task query returned no task for " + runId,
                );
            }
            const status = utils.json.optionalGet(task, "$.status");
            if (status === "failed") {
                logger.warn("kling task reached a terminal failure", {
                    runId,
                });
                return {
                    kind: "COMPLETED",
                    // OURS synthesized (the TASK failed) / THEIRS was a 200
                    // (the poll exchange itself succeeded) — design D12
                    httpStatus: 500,
                    providerHttpStatus: res.status,
                    output: task,
                };
            }
            if (status !== "succeeded") {
                // submitted | processing — or a status we do not know, which
                // is still in flight, never a success (minimax D7a)
                return {
                    kind: "RUNNING",
                    state: {
                        externalRunId: runId,
                        ...(typeof status === "string"
                            ? { stage: status }
                            : {}),
                    },
                };
            }
            // succeeded → the result rides on outputs[].url of type video
            const outputs = utils.json.optionalGet(task, "$.outputs");
            const hasVideoUrl = Array.isArray(outputs) &&
                outputs.some((o) =>
                    o !== null && typeof o === "object" && !Array.isArray(o) &&
                    o.type === "video" && typeof o.url === "string" &&
                    o.url !== ""
                );
            if (!hasVideoUrl) {
                logger.warn("kling task succeeded without a video url", {
                    runId,
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: task,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                providerHttpStatus: res.status,
                output: task,
            };
        },
        // no stop — Kling exposes no cancel (v1 `stoppable: false`)
    },
    usage: {
        /** THE credit system (design D3): Kling meters resource-package
         *  UNITS — the price list is in units (1 unit = $0.14 list) and the
         *  task receipt reports units — so the pool IS units. Every
         *  endpoint's model pins its published units-per-second lines; the
         *  $/unit conversion and any markup are the broker card's job, not
         *  the connector's (owner rule: the pool follows what the vendor
         *  meters). */
        credits: {
            default: {
                label: "Kling units",
                description:
                    "Resource-package units; Kling lists 1 unit = US$0.14.",
            },
        },
        /** The VENDOR's meter (design D4, D27): the completed task carries
         *  `billing[]`, one row per deduction — `charge_type: "unit"` rows
         *  carry `amount` in the very units this pool counts, so their sum
         *  IS the claim (it wins; the derived fold cross-checks it). A
         *  `cash` row is dollars off the account balance, another pool this
         *  doc does not declare, so its presence forfeits the claim and the
         *  fold settles. `pluck` does the D27 strip in the same motion: the
         *  receipt names our account type and package, and never rides the
         *  payload. Absent or empty `billing` claims nothing (never `?? 0`).
         *  `amount` is a decimal STRING ("1.8"). */
        consolidate: ({ data, utils, logger }) => {
            const { value, rest } = utils.json.pluck(data.output, "$.billing");
            const rows = Array.isArray(value) ? value : [];
            let units = 0;
            let claimable = rows.length > 0;
            for (const row of rows) {
                if (
                    row === null || typeof row !== "object" ||
                    Array.isArray(row) || row.charge_type !== "unit"
                ) {
                    claimable = false;
                    continue;
                }
                units += Number(row.amount);
            }
            if (rows.length > 0 && !claimable) {
                logger.warn(
                    "kling billing[] carries rows this doc cannot claim — the derived fold settles",
                );
            }
            const credits: Record<string, number> =
                claimable && Number.isFinite(units) ? { default: units } : {};
            return { credits, output: rest };
        },
        // No provider-level model/estimate/evidence: every endpoint has ≥2
        // metered lines (a resolution × tier rate card), so the compiler
        // requires DOC-level fns anyway — a generic provider fn could not
        // know which line a count belongs to (design D5).
    },
});
