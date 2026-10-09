import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

const zFile = z.strictObject({
    // SuperCool fetches attachments over https only (any other scheme comes
    // back as an unfetched file in `notes`), so the mirror refuses it first.
    url: z.string().url().regex(/^https:\/\//, "must be an https URL")
        .describe(
            "A public https URL SuperCool downloads the file from (an image, " +
                "a logo, a PDF brief, a video).",
        ),
    name: z.string().min(1).max(200).optional().describe(
        "The file name the agent sees.",
    ),
});

const zBody = z.strictObject({
    message: z.string().min(1).max(20_000).describe(
        'What to make or do, in plain English: "a 15-second vertical ad ' +
            'for our coffee subscription", "a landing page for a bakery ' +
            'called Bean There", "a 6-slide pitch deck about our seed ' +
            'round", "research the top 5 competitors of Notion with ' +
            'sources". Each request stands on its own: include everything ' +
            "the work needs in it.",
    ),
    files: z.array(zFile).max(5).optional().describe(
        "Up to 5 files for the agent to use, by URL (10 MB each).",
    ),
});

/**
 * `POST /v1/messages` — ask the SuperCool agent for something, and get the
 * finished work back.
 *
 * ASYNC. The submit answers within about 30 seconds: a plain reply comes
 * back `final: true` at once; work that runs longer answers
 * `status: "processing"`, and the lifecycle long-polls
 * `GET /v1/messages/{id}?wait=30` until `final` is true. Videos and sites
 * take minutes, so the whole-run budget is 45 minutes.
 *
 * TERMINAL STATUSES (when `final` is true): `completed`, `partial` (some
 * jobs finished) and `needs_input` (the agent asked a question — answer it
 * with a new message) are successes and settle the receipt. `blocked`
 * (the account is out of credits, or at its running-work cap), `failed`
 * and `expired` are failures under a matching HTTP status; the engine
 * zero-bills them.
 *
 * QUEUED FOR CREDITS. An account out of credits gets its work queued, not
 * refused: `status: "blocked"`, `final: false`, `resume: "add_credits"`,
 * held up to 24 hours (`resume_by`) for a top-up. That is far past this
 * run's budget, so the run settles at once as a 402 (nothing has been
 * drawn yet) instead of polling into a TIMEOUT with no receipt.
 */
export default defineEndpoint({
    meta: {
        displayName: "SuperCool Agent",
        summary:
            "Ask an AI agent for a video, image, website, deck, document, song or research, and get the finished files back.",
        description: "Hand SuperCool a request in plain English and it " +
            "plans the work, runs it, and returns the result: the agent's " +
            "reply, the jobs it ran with their titles and status, and " +
            "download links for every file it produced (videos, images, " +
            "audio, PDFs, presentations) or the live link to a published " +
            "site. Attach up to 5 files by URL for it to use (a logo, " +
            "product photos, a brief). Replies come back in seconds; " +
            "images in about a minute; websites, decks and videos in " +
            "several minutes, and the run waits for them. A `needs_input` " +
            "status means the agent asked a question: send the answer as a " +
            "new message. Billing is the SuperCool credits the work " +
            "actually used, reported on every message as `credits_used`.",
        docsUrl: "https://supercool.com/docs/api",
        categories: ["agents", "video-generation", "image-generation"],
        notes: [
            "Download links are signed and expire; save files you need.",
            "Each request is independent; include all the details the work needs.",
        ],
    },
    request: { method: "POST", path: "/v1/messages" },
    input: { schema: { body: zBody } },
    timeouts: { requestMs: 60_000, runMs: 2_700_000, pollMs: 2_000 },
    lifecycle: {
        start: async ({ data, utils, logger }) => {
            const res = await utils.request({
                headers: {
                    ...data.request.headers,
                    "Idempotency-Key": data.run.runId + ":submit",
                },
            });
            if (res.status < 200 || res.status >= 300) {
                // Vendor non-2xx is DATA, zero-billed by the engine.
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const id = utils.json.optionalGet(res.body, "$.id");
            if (typeof id !== "string" || id === "") {
                throw Object.assign(
                    new Error("SuperCool returned no message id"),
                    { retriable: false },
                );
            }
            if (
                utils.json.optionalGet(res.body, "$.resume") === "add_credits"
            ) {
                // Held for a credit top-up (up to 24h, far past this run's
                // budget): it would run and bill after a later top-up,
                // outside this run. Cancel it first (queued work is removed
                // before it runs) and settle only on the message SuperCool
                // reports final: a 402 when nothing was used, else the
                // receipt earlier work drew. Not final yet (the cancel
                // failed, or a top-up started it first): keep polling; a
                // poll that sees it held again cancels again (idempotent).
                const held = await utils.http({
                    method: "POST",
                    path: "/v1/messages/" + encodeURIComponent(id) + "/cancel",
                });
                if (
                    held.status < 200 || held.status >= 300 ||
                    utils.json.optionalGet(held.body, "$.final") !== true
                ) {
                    logger.warn(
                        "supercool held work not settled yet; polling",
                        {
                            status: held.status,
                        },
                    );
                    return {
                        kind: "RUNNING",
                        state: { externalRunId: id },
                        pollAfterMs: 30_000,
                    };
                }
                const used = utils.json.optionalNum(
                    held.body,
                    "$.credits_used",
                );
                return used !== undefined && used > 0
                    ? { kind: "COMPLETED", httpStatus: 200, output: held.body }
                    : {
                        kind: "COMPLETED",
                        httpStatus: 402,
                        providerHttpStatus: res.status,
                        output: held.body,
                    };
            }
            if (utils.json.optionalGet(res.body, "$.final") !== true) {
                return { kind: "RUNNING", state: { externalRunId: id } };
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            const reason = utils.json.optionalGet(res.body, "$.reason");
            const httpStatus = status === "completed" ||
                    status === "partial" || status === "needs_input"
                ? 200
                : status === "blocked"
                ? (reason === "out_of_credits"
                    ? 402
                    : reason === "too_many_running"
                    ? 429
                    : 409)
                : status === "expired"
                ? 504
                : reason === "agent_busy"
                ? 503
                : 502;
            return {
                kind: "COMPLETED",
                httpStatus,
                ...(httpStatus === 200
                    ? {}
                    : { providerHttpStatus: res.status }),
                output: res.body,
                state: { externalRunId: id },
            };
        },
        poll: async ({ data, utils, logger }) => {
            const id = data.lifecycle.state.externalRunId;
            if (id === undefined) {
                throw Object.assign(
                    new Error("SuperCool poll without a message id in state"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "GET",
                path: "/v1/messages/" + encodeURIComponent(id) + "?wait=30",
            });
            if (
                res.status === 408 || res.status === 429 || res.status >= 500
            ) {
                // A status read that failed, not work that ended: the work
                // is still running on SuperCool's side, so hold the run.
                logger.warn("supercool status read failed; retrying", {
                    status: res.status,
                });
                return { kind: "RUNNING", pollAfterMs: 10_000 };
            }
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            if (
                utils.json.optionalGet(res.body, "$.resume") === "add_credits"
            ) {
                // Held for a credit top-up: cancel, then settle (see start).
                const held = await utils.http({
                    method: "POST",
                    path: "/v1/messages/" + encodeURIComponent(id) + "/cancel",
                });
                if (
                    held.status < 200 || held.status >= 300 ||
                    utils.json.optionalGet(held.body, "$.final") !== true
                ) {
                    logger.warn(
                        "supercool held work not settled yet; polling",
                        {
                            status: held.status,
                        },
                    );
                    return {
                        kind: "RUNNING",
                        state: { externalRunId: id },
                        pollAfterMs: 30_000,
                    };
                }
                const used = utils.json.optionalNum(
                    held.body,
                    "$.credits_used",
                );
                return used !== undefined && used > 0
                    ? { kind: "COMPLETED", httpStatus: 200, output: held.body }
                    : {
                        kind: "COMPLETED",
                        httpStatus: 402,
                        providerHttpStatus: res.status,
                        output: held.body,
                    };
            }
            if (utils.json.optionalGet(res.body, "$.final") !== true) {
                return { kind: "RUNNING" };
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            const reason = utils.json.optionalGet(res.body, "$.reason");
            const httpStatus = status === "completed" ||
                    status === "partial" || status === "needs_input"
                ? 200
                : status === "blocked"
                ? (reason === "out_of_credits"
                    ? 402
                    : reason === "too_many_running"
                    ? 429
                    : 409)
                : status === "expired"
                ? 504
                : reason === "agent_busy"
                ? 503
                : 502;
            return {
                kind: "COMPLETED",
                httpStatus,
                ...(httpStatus === 200
                    ? {}
                    : { providerHttpStatus: res.status }),
                output: res.body,
            };
        },
        /** Cancel (`POST /v1/messages/{id}/cancel`): queued work is
         *  removed, this message's own running work is stopped, and work
         *  started after it is cancelled as it arrives. Credits already used
         *  stay on the message, so a final message SETTLES its receipt here
         *  (the stopped work drew them); one that isn't final yet is read
         *  again briefly, then left UNRESOLVED for the host to reconcile. */
        stop: async ({ data, utils, logger }) => {
            const id = data.lifecycle.state.externalRunId;
            if (id === undefined) {
                throw Object.assign(
                    new Error("SuperCool stop without a message id in state"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "POST",
                path: "/v1/messages/" + encodeURIComponent(id) + "/cancel",
            });
            if (res.status < 200 || res.status >= 300) {
                logger.warn("supercool cancel failed", { status: res.status });
                return {
                    kind: "UNRESOLVED",
                    reason: "cancel answered " + String(res.status),
                };
            }
            let body = res.body;
            for (
                let i = 0;
                i < 3 && utils.json.optionalGet(body, "$.final") !== true;
                i++
            ) {
                const read = await utils.http({
                    method: "GET",
                    path: "/v1/messages/" + encodeURIComponent(id) +
                        "?wait=20",
                });
                if (read.status >= 200 && read.status < 300) {
                    body = read.body;
                }
            }
            if (utils.json.optionalGet(body, "$.final") !== true) {
                return {
                    kind: "UNRESOLVED",
                    reason: "work still running on SuperCool after cancel",
                };
            }
            return { kind: "COMPLETED", httpStatus: 200, output: body };
        },
    },
    usage: {
        /** The receipt, counted in HUNDREDTHS of a credit so the fold
         *  (`ceil(count) × 0.01`) equals `credits_used` exactly. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            label: "credits",
            consumes: { credit: "default", amount: 0.01 },
            description:
                "SuperCool credits the work used, counted in hundredths of a credit",
        },
        /** A typical sizeable job, 1,000 credits (in hundredths): the
         *  pre-run figure. The agent decides what the work needs, so no
         *  input knob bounds it; the receipt settles the real amount,
         *  usually far below for replies and images, above for long
         *  videos. */
        estimate: () => ({ counts: { "CREDIT": 100_000 } }),
        evidence: ({ data, utils }) => {
            const used = utils.json.optionalNum(data.output, "$.credits_used");
            return {
                counts: {
                    "CREDIT": used !== undefined && used > 0
                        ? Math.round(used * 100)
                        : 0,
                },
            };
        },
    },
});
