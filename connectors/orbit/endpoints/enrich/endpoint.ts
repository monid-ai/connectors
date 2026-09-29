import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zEnrichBody, zEnrichPathParams } from "./schema/inputs.ts";

/**
 * `POST /v3/enrich/{profile_id}` — build one person's profile deeper.
 *
 * ASYNC. The submit answers with `request_id` and a status; the lifecycle
 * polls the route Orbit names in `links.status` until the status is terminal,
 * so one monid run returns the finished profile.
 *
 * THE RECEIPT SETTLES IT, and nothing else can. A `202 running` says nothing
 * about whether work will be charged: an enrich of a profile already at the
 * requested depth can answer `202` with `reservedCredits: 0`, run a free
 * reconciliation for a few seconds, and settle `consumedCredits: 0`
 * (verified live). The provider's evidence reads the receipt, so that run
 * settles at zero and a real build settles at what Orbit charged for it.
 *
 * THE BUDGET IS MEASURED. A partial build settles in under two minutes; a full build
 * and a `regenerate` were measured at 24 to 27 minutes. A run that times out
 * is still charged on Orbit's side, so the whole-run budget covers the slow
 * case and the cadence backs off once the run is clearly a long build.
 */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Person Profile",
        summary: "Build one person's profile to partial or full depth.",
        description: "Build a person's Orbit profile deeper, and get the " +
            "finished profile back. `partial` produces a useful profile in " +
            "seconds. `full` produces the deepest profile Orbit can build — " +
            "web, social and public-record research pulled together into " +
            "attributed sections on the person's background, interests and " +
            "recent activity. `regenerate` forces " +
            "fresh work that CAN REPLACE facts already on the profile, so " +
            "reach for it only when a refresh is what was asked for. Takes " +
            "an Orbit " +
            "profile id, alias id, or public slug; `orbit#v3/search` finds " +
            "one from a name, an email, a phone number or a description. " +
            "Reach for this when an agent already knows who the person is " +
            "and wants more depth than the stored profile carries; " +
            "`orbit#v3/profile/{profile_id}` reads what is already there. " +
            "A profile already at the depth you asked for returns as it " +
            "stands and costs nothing. Otherwise 5 credits for `partial`, " +
            "10 for `full` and `regenerate` — a full build includes its " +
            "partial. `partial` settles in under two minutes; `full` and " +
            "`regenerate` research live sources and take 25 to 30 minutes.",
        docsUrl: "https://docs.orbitsearch.com/api/enrich/enrich-profile",
        categories: ["people-enrichment"],
    },
    request: { method: "POST", path: "/v3/enrich/{profile_id}" },
    input: {
        schema: {
            pathParams: zEnrichPathParams,
            body: zEnrichBody.extend({
                include_profile: zEnrichBody.shape.include_profile.unwrap()
                    .default(true),
            }),
        },
    },
    /** Measured live: partial builds settle in under two minutes, `full` and
     *  `regenerate` take 24 to 27 minutes. 45 minutes is the whole-run
     *  budget; a run that times out is still charged by Orbit. */
    timeouts: { requestMs: 60_000, runMs: 2_700_000, pollMs: 5_000 },
    lifecycle: {
        state: z.strictObject({
            statusPath: z.string().describe(
                "The status route Orbit named in `links.status`.",
            ),
        }),
        start: async ({ data, utils, logger }) => {
            const res = await utils.request({
                headers: {
                    ...data.request.headers,
                    "Idempotency-Key": data.run.runId + ":submit",
                },
            });
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const requestId = utils.json.optionalGet(res.body, "$.request_id");
            if (typeof requestId !== "string" || requestId === "") {
                throw new Error("Orbit did not return a request_id");
            }
            // The v3 contract tells callers to poll `links.status`; a request
            // that completes on the submit carries no such link, and its id
            // can hold a colon, so the fallback path is encoded.
            const link = utils.json.optionalGet(res.body, "$.links.status");
            const statusPath =
                typeof link === "string" && link.charAt(0) === "/"
                    ? link
                    : "/v3/enrich/requests/" + encodeURIComponent(requestId);
            const state = { externalRunId: requestId, data: { statusPath } };
            const status = utils.json.optionalGet(res.body, "$.status");
            if (status === "failed") {
                // The reason sits at `failure`, where the provider's
                // fromError does not look — lifted into Orbit's own error
                // envelope, exactly as the poll does it.
                const failure = utils.json.optionalGet(res.body, "$.failure");
                const message = utils.json.optionalGet(
                    failure ?? null,
                    "$.message",
                );
                const code = utils.json.optionalGet(failure ?? null, "$.code");
                logger.warn("orbit enrich failed on submit", { requestId });
                return {
                    kind: "COMPLETED",
                    httpStatus: 500,
                    providerHttpStatus: res.status,
                    output: {
                        status: "failed",
                        error: {
                            code: typeof code === "string"
                                ? code
                                : "enrich_failed",
                            message:
                                typeof message === "string" && message !== ""
                                    ? message
                                    : "Orbit enrichment failed",
                        },
                        request_id: requestId,
                    },
                    state,
                };
            }
            const receipt = utils.json.optionalGet(
                res.body,
                "$.billing.status",
            );
            if (status !== "running" && receipt !== "open") {
                logger.info("orbit enrich settled on submit", {
                    requestId,
                    status: String(status),
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                    state,
                };
            }
            return { kind: "RUNNING", state };
        },
        poll: async ({ data, utils, logger }) => {
            const requestId = data.lifecycle.state.externalRunId;
            if (requestId === undefined) {
                throw Object.assign(
                    new Error("orbit enrich poll without externalRunId"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "GET",
                path: data.lifecycle.state.data?.statusPath ??
                    "/v3/enrich/requests/" + encodeURIComponent(requestId),
            });
            if (res.status === 408 || res.status === 429 || res.status >= 500) {
                // The status LOOKUP failed while the build keeps running and
                // keeps drawing credits — the provider's one retry class.
                // `Retry-After` is in SECONDS; an absent or malformed header
                // falls back to a fixed backoff, clamped so a bad value
                // cannot stall the run. Bounded by runMs.
                const after = Number(res.headers["retry-after"]);
                const pollAfterMs = Number.isFinite(after) && after > 0
                    ? Math.min(Math.max(after * 1000, 1_000), 120_000)
                    : 15_000;
                logger.warn("orbit enrich status lookup transient", {
                    requestId,
                    status: res.status,
                    pollAfterMs,
                });
                return { kind: "RUNNING", pollAfterMs };
            }
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            const receipt = utils.json.optionalGet(
                res.body,
                "$.billing.status",
            );
            if (status === "running" || receipt === "open") {
                // Two minutes in, this is a full build, and those run for
                // tens of minutes: fifteen seconds a tick.
                return data.lifecycle.state.timing.attempts > 24
                    ? { kind: "RUNNING", pollAfterMs: 15_000 }
                    : { kind: "RUNNING" };
            }
            if (status === "failed") {
                // The BUILD failed while the status route answered 200 —
                // ours/theirs (design D12), shaped like Orbit's own error
                // envelope so one mapper reads it.
                const failure = utils.json.optionalGet(res.body, "$.failure");
                const message = utils.json.optionalGet(
                    failure ?? null,
                    "$.message",
                );
                const code = utils.json.optionalGet(failure ?? null, "$.code");
                logger.warn("orbit enrich failed", { requestId });
                return {
                    kind: "COMPLETED",
                    httpStatus: 500,
                    providerHttpStatus: 200,
                    output: {
                        status: "failed",
                        error: {
                            code: typeof code === "string"
                                ? code
                                : "enrich_failed",
                            message:
                                typeof message === "string" && message !== ""
                                    ? message
                                    : "Orbit enrichment failed",
                        },
                        request_id: requestId,
                    },
                };
            }
            logger.info("orbit enrich settled", { requestId });
            return { kind: "COMPLETED", httpStatus: 200, output: res.body };
        },
    },
    usage: {
        /** Metered in Orbit's own credits; the provider's evidence reads the
         *  receipt, so a profile already at depth settles the zero Orbit
         *  charged for it. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "profile build",
            description:
                "what the build drew, as Orbit's own receipt totals it",
        },
        /** One profile at the depth asked for, from the published card. A
         *  full build includes its partial, so it is 10 and never 5 + 10. */
        estimate: ({ data }) => ({
            counts: {
                CREDIT: data.input.body.operation === "partial" ? 5 : 10,
            },
        }),
    },
});
