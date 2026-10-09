import { defineProvider, presets } from "@shared/core";

/**
 * Alibaba — Alibaba Cloud Model Studio (DashScope, Singapore region), ported
 * from monid-services `adaptors/alibaba/*`.
 *
 * Alibaba is the PLATFORM: one credential, one base URL, two model families
 * behind two paths — Wan VIDEO (six models, one async submit path + one
 * task path) and Qwen / Wan IMAGE (four models, one blocking path). The
 * second MIXED-MODE provider after suzanne, laid out the same way (suzanne
 * D3): `resolve()` only falls back and a provider-level `lifecycle.start`
 * reaches every endpoint, so the provider states the MAJORITY — the async
 * video submit and its poll — and the four image endpoints override
 * `start` with the blocking relay. Consequence, eyes open: the image docs
 * also resolve `poll` and carry an inert `timeouts.pollMs`; one unused fn
 * ref beats weakening the contract check on a paid path.
 *
 * Ported 1:1 from v1's `makeWanStart` / `makeWanPoll`:
 *   - start: POST the create-task request (the video endpoints add the
 *     `X-DashScope-Async: enable` header DashScope requires on this path —
 *     and forbids on the blocking image path — through their own
 *     `request.headers`, design D6). A non-2xx is DATA (COMPLETED,
 *     zero-billed); a 2xx carrying DashScope's error envelope (a non-empty
 *     top-level `code`) is an upstream error dressed as success and
 *     settles as a synthesized 502 (design D7); a clean 2xx without
 *     `output.task_id` is a contract violation (deterministic throw); else
 *     park with the task id as `externalRunId`.
 *   - poll: GET the task. A non-2xx on OUR GET THROWS (bytedance D7 — the
 *     task is very likely still running, and DashScope bills the generation
 *     whether or not we keep asking). PENDING / RUNNING — or any status we
 *     do not know — stays RUNNING (`runMs` bounds it); FAILED / CANCELED /
 *     UNKNOWN (expired) synthesize 500; SUCCEEDED without `video_url`
 *     synthesizes 502; SUCCEEDED settles the task envelope verbatim, its
 *     `usage` block being the billing basis the evidence fns read.
 *   - no stop: DashScope cancel applies to PENDING tasks only (v1
 *     `stoppable: false`). We do not advertise what we cannot honor.
 *
 * NO `usage.consolidate` (design D4): DashScope reports QUANTITIES
 * (`usage.duration`, `usage.output_image_count`, `usage.image_count`) but
 * never a dollar figure, and a quantities reading is `evidence`, not a
 * vendor claim. So the derived fold IS the bill, there is no per-run
 * `usage.mismatch.derived` cross-check, and the pinned rates are guarded by
 * the literal table in `lifecycle.test.ts` and by test:live only.
 *
 * NO `lifecycle.state` schema: the task id rides `externalRunId` and the
 * status rides `stage`. v1 stashed the resolution at submit; here the
 * evidence fns read the REQUEST (design D5).
 *
 * NOTE (idempotency): DashScope documents no idempotency key, so the submit
 * is not deduplicated — a host-side retry of the start tick could
 * double-submit. Carried over from v1 as a known gap.
 */
export default defineProvider({
    name: "alibaba",
    meta: {
        displayName: "Alibaba",
        summary:
            "AI media generation on Alibaba Cloud Model Studio — Wan video (up to 30s with audio, editing) and Qwen-Image / Wan image.",
        description:
            "AI media generation on Alibaba Cloud Model Studio — create " +
            "videos from text, images, or reference media with the Wan " +
            "family (up to 30s with synchronized audio, plus video " +
            "editing), and generate or edit images with Qwen-Image 3.0 and " +
            "Wan 2.7 Image (dense text rendering, 4K, story-coherent image " +
            "sets). Per-model limits live on each endpoint.",
        homepageUrl: "https://www.alibabacloud.com/en/product/modelstudio",
        docsUrl: "https://www.alibabacloud.com/help/en/model-studio/",
        categories: ["video-generation", "image-generation"],
        /** Caveats true of EVERY Alibaba endpoint (v1's shared `notes`).
         *  Endpoint notes concatenate after these. */
        notes: [
            "Media URLs must be public https:// URLs that DashScope can " +
            "fetch server-side — inline base64 and Asset Center ids are " +
            "not accepted.",
            "Result URLs (MP4 video, PNG images) EXPIRE about 24 hours " +
            "after generation — download promptly.",
            "Prompts beyond a model's length limit are silently truncated " +
            "upstream, not rejected.",
            "A rejected request (invalid combination, content moderation) " +
            "returns DashScope's error code and costs nothing; a failed " +
            "task bills nothing.",
            "There is no cancel: a submitted video task runs to completion " +
            "and is billed even if the run is abandoned.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: {
        baseUrl: "https://dashscope-intl.aliyuncs.com",
        // v1's runtime sent this on every call (the bytedance posture)
        headers: { Accept: "application/json" },
    },
    // The VIDEO budget is the provider default (six of ten endpoints):
    // mirrors the `timeouts` every v1 video def overrides (design D10) —
    // 30s per HTTP call, 30min per run (the slowest documented generations
    // run ~17 minutes), poll every 30s. The image endpoints state their own
    // blocking-call budget.
    timeouts: { requestMs: 30_000, runMs: 1_800_000, pollMs: 30_000 },
    lifecycle: {
        start: async ({ utils, logger }) => {
            // the DEFAULT RELAY: method/url/headers from the compiled
            // request (the video endpoints' async header included), body
            // from the caller input AFTER input.toRequest — so the pinned
            // model id and the "auto" duration sentinel are already in
            // place (design D2)
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                // DashScope API error (bad media URL, invalid combination,
                // quota) — no task was created, nothing will be billed: DATA
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            // DashScope's error envelope is `{code, message, request_id}`
            // with a NON-EMPTY string `code`; success bodies carry none.
            // The docs never pin the HTTP status of every error class, so a
            // 2xx is checked too — otherwise a 200-shaped failure would
            // relay as a paid success (design D7).
            const code = utils.json.optionalGet(res.body, "$.code");
            if (typeof code === "string" && code !== "") {
                logger.warn(
                    "dashscope submit answered 2xx with an error envelope — synthesizing 502",
                    { code },
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
            const taskId = utils.json.optionalGet(res.body, "$.output.task_id");
            if (typeof taskId !== "string" || taskId === "") {
                // clean envelope with no task id: DashScope violated its own
                // contract. Deterministic — retrying cannot fix it.
                throw Object.assign(
                    new Error("DashScope submit returned no task_id"),
                    { retriable: false },
                );
            }
            logger.debug("dashscope task submitted", { taskId });
            return { kind: "RUNNING", state: { externalRunId: taskId } };
        },
        poll: async ({ data, utils, logger }) => {
            const runId = data.lifecycle.state.externalRunId;
            if (runId === undefined) {
                // corrupted thread state — deterministic, never retriable
                throw Object.assign(
                    new Error("alibaba poll without externalRunId in state"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "GET",
                path: "/api/v1/tasks/" + encodeURIComponent(runId),
            });
            if (res.status < 200 || res.status >= 300) {
                // bytedance D7: OUR poll GET failed while the task is very
                // likely still generating — and billing. Throw (retriable)
                // rather than settle, so a transient blip does not abandon
                // a video we are paying for.
                throw new Error(
                    "DashScope task query returned " + String(res.status),
                );
            }
            const task = res.body;
            const status = utils.json.optionalGet(task, "$.output.task_status");
            if (
                status === "FAILED" || status === "CANCELED" ||
                status === "UNKNOWN"
            ) {
                // UNKNOWN = the task expired or was evicted upstream — it
                // cannot legitimately happen inside our 30-minute window
                // and is terminal either way
                logger.warn("dashscope task reached a terminal failure", {
                    runId,
                    status,
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
            if (status !== "SUCCEEDED") {
                // PENDING | RUNNING — or a status we do not know, which is
                // still in flight, never a success (minimax D7a)
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
            const videoUrl = utils.json.optionalGet(task, "$.output.video_url");
            if (typeof videoUrl !== "string" || videoUrl === "") {
                logger.warn("dashscope task succeeded without video_url", {
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
        // no stop — DashScope cancel is PENDING-only (v1 `stoppable: false`)
    },
    output: {
        /**
         * Presentation only — runs AFTER usage.evidence, which reads the RAW
         * envelope, so a strip can never change a bill. The Wan 2.7 Image
         * responses carry token counters DashScope documents as "not
         * billed" (billing is per image) — provider-internal accounting
         * noise, stripped as v1 did (design D11; the minimax precedent for
         * internal token counts). `utils.json.omit` is DEEP; the three keys
         * occur nowhere else in DashScope's video, task or Qwen envelopes.
         *
         * DELIBERATELY KEPT — the bases callers are billed on and must be
         * able to check: `usage.duration` / `input_video_duration` /
         * `output_video_duration` / `SR` (video), `usage.output_image_count`
         * / `input_image_count` / `output_image_type` (Qwen),
         * `usage.image_count` / `size` (Wan Image).
         */
        fromResponse: ({ data, utils }) =>
            utils.json.omit(data.output, [
                "input_tokens",
                "output_tokens",
                "total_tokens",
                "characters",
            ]),
    },
    usage: {
        /** THE credit system (design D3): Model Studio publishes every
         *  Singapore rate in US dollars, so the pool IS dollars — the
         *  bytedance / minimax posture. Each endpoint's model pins its
         *  published per-line $ draws; markup is the broker card's job. */
        credits: { default: { label: "US dollars" } },
        // No `consolidate`: nothing in any DashScope response body is a
        // consumed-credits or dollar claim (design D4).
        // No provider-level model/estimate/evidence: the video endpoints
        // have ≥2 metered lines (one per resolution), so the compiler
        // requires DOC-level fns anyway (design D5).
    },
});
