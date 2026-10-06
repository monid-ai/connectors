import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zOrbitSearchBody } from "./schema/inputs.ts";

const [zQueryArm, zIntentArm, zSignalsArm] = zOrbitSearchBody.options;

/** Orbit's own documented defaults, stated at the binding on each arm of
 *  the union (D25 — the mirror carries optionality only) so the compiled
 *  doc shows them. JSON-Schema defaults never materialize inside `anyOf`,
 *  so the estimate reads the same numbers as fallbacks, and Orbit applies
 *  them on the wire. The fields are the same on every arm, so one arm's
 *  shape names them. */
const orbitDefaults = {
    candidate_discovery: zQueryArm.shape.candidate_discovery.unwrap().default(
        false,
    ),
    candidate_discovery_limit: zQueryArm.shape.candidate_discovery_limit
        .unwrap().default(10),
    profile_depth: zQueryArm.shape.profile_depth.unwrap().default("partial"),
    include_profile: zQueryArm.shape.include_profile.unwrap().default(true),
    limit: zQueryArm.shape.limit.unwrap().default(20),
};

/**
 * `POST /v3/search` — find people, and come back with their context.
 *
 * ASYNC. The submit answers `202` with a snapshot carrying `search_id` and
 * `status: "running"`; the lifecycle polls the route Orbit names in
 * `links.status` until the status is terminal, so ONE monid run returns
 * finished work. A search over people Orbit can already answer for settles
 * on the submit without a single poll.
 *
 * THE RECEIPT SETTLES IT. The terminal snapshot carries Orbit's own
 * `billing` receipt and `consumedCredits` is the charge; the provider's
 * evidence and consolidate read it, and this endpoint adds nothing to them.
 * The run is financially terminal when the RECEIPT is: a terminal status
 * whose receipt still reads `open` is polled again, so a settle that lands a
 * moment after the status never bills a partial figure.
 *
 * THE BUDGET IS MEASURED, NOT GUESSED. Partial-depth and index-only searches
 * settle inside 90 seconds; a full-depth build was measured at 24 to 27
 * minutes. A run that times out while Orbit finishes still gets charged on
 * Orbit's side, so the whole-run budget covers the slow case, and the
 * cadence backs off once a run is clearly a long build — twenty-five minutes
 * at five seconds a tick is three hundred status reads nobody needs.
 *
 * ESTIMATE IS THE CEILING the caller authorized, and it is worth reading
 * before running: `limit: 100, profile_depth: "full"` authorizes up to 1,010
 * credits, because every one of those hundred people might be a profile Orbit
 * has to build from live sources. Typical searches settle far below it.
 */
export default defineEndpoint({
    meta: {
        displayName: "Orbit People Search",
        summary:
            "Find people and get the deepest available context about each one.",
        description: "Find people and come back with deep, source-backed " +
            "context about each of them. Describe who you want in plain " +
            "English (`the founder of Anthropic`, `machine learning " +
            "engineers in Brooklyn who write about music`), pass structured " +
            "criteria in `intent`, or hand over what you already know in " +
            "`signals` — an email, a phone number, a street address, a " +
            "profile URL, a social handle. Any one of `query`, `intent` or " +
            "`signals` is enough, and they combine. Each ready result " +
            "carries identity and contact fields plus generated sections on " +
            "the person's background, interests and recent activity, every " +
            "claim attributed to the source it came from. `profile_depth` " +
            "picks how deep to go: `partial` answers in under two minutes, " +
            "`full` builds the deepest profile Orbit can and takes 25 to " +
            "30 minutes. Set " +
            "`candidate_discovery: true` when a signal belongs to several " +
            "people — an address, a shared phone — and you want each of " +
            "them resolved. For more than about ten people, set " +
            "`include_profile: false` and read the profiles you need with " +
            "`orbit#v3/profile/{profile_id}` — a hundred embedded profiles " +
            "is a very large result. Reach for this the moment a person " +
            "becomes the " +
            "subject — a name the user dropped in passing, a prospect " +
            "before outreach, a candidate or counterparty under diligence, " +
            "or the people behind a company you are researching (name the " +
            "employer in `intent` and Orbit returns its people). This " +
            "endpoint runs the whole search and returns the finished " +
            "snapshot. Pricing follows the " +
            "results: 1 credit per 10 people returned from the Orbit index, " +
            "1 per person candidate discovery resolves, and 5 (partial) or " +
            "10 (full) for each profile Orbit builds for you. Read " +
            "`estimate` before a large or full-depth run.",
        docsUrl: "https://docs.orbitsearch.com/api/search/search",
        categories: ["people-enrichment"],
        notes: [
            "`candidate_discovery_limit` is read with `candidate_discovery: " +
            "true`; on its own it changes nothing.",
        ],
    },
    request: { method: "POST", path: "/v3/search" },
    input: {
        schema: {
            // `limit` and `candidate_discovery_limit` are the limiting
            // knobs, and both are vendor-published, so the estimate reads a
            // concrete cap without a house constant.
            body: z.union([
                zQueryArm.extend(orbitDefaults),
                zIntentArm.extend(orbitDefaults),
                zSignalsArm.extend(orbitDefaults),
            ]),
        },
    },
    /** Measured live: index-only and partial-depth searches settle inside
     *  90 s, full-depth builds take 24 to 27 minutes. 45 minutes is the
     *  whole-run budget; a run that times out is still charged by Orbit. */
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
                // Vendor non-2xx is DATA, zero-billed by the engine:
                // 400 bad input, 402 out of credits, 403 scope, 429 limit.
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const searchId = utils.json.optionalGet(res.body, "$.search_id");
            if (typeof searchId !== "string" || searchId === "") {
                throw new Error("Orbit did not return a search_id");
            }
            // `results` is REQUIRED on a v3 snapshot; a 2xx without it is as
            // broken as a 2xx without `search_id`.
            if (
                !Array.isArray(utils.json.optionalGet(res.body, "$.results"))
            ) {
                throw new Error("Orbit search snapshot carried no results");
            }
            // The v3 contract tells callers to poll `links.status`.
            const link = utils.json.optionalGet(res.body, "$.links.status");
            const statusPath =
                typeof link === "string" && link.charAt(0) === "/"
                    ? link
                    : "/v3/search/" + encodeURIComponent(searchId);
            const state = { externalRunId: searchId, data: { statusPath } };
            const status = utils.json.optionalGet(res.body, "$.status");
            if (status === "failed") {
                // The reason sits at `candidate_discovery_failure`, where the
                // provider's fromError does not look — lifted into Orbit's
                // own error envelope, exactly as the poll does it.
                const failure = utils.json.optionalGet(
                    res.body,
                    "$.candidate_discovery_failure",
                );
                const message = utils.json.optionalGet(
                    failure ?? null,
                    "$.message",
                );
                const code = utils.json.optionalGet(failure ?? null, "$.code");
                logger.warn("orbit search failed on submit", { searchId });
                return {
                    kind: "COMPLETED",
                    httpStatus: 500,
                    providerHttpStatus: res.status,
                    output: {
                        status: "failed",
                        error: {
                            code: typeof code === "string"
                                ? code
                                : "search_failed",
                            message:
                                typeof message === "string" && message !== ""
                                    ? message
                                    : "Orbit search failed",
                        },
                        search_id: searchId,
                    },
                    state,
                };
            }
            const receipt = utils.json.optionalGet(
                res.body,
                "$.billing.status",
            );
            if (status !== "running" && receipt !== "open") {
                // A search over people Orbit can already answer for never
                // goes RUNNING at all.
                logger.info("orbit search settled on submit", {
                    searchId,
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
            const searchId = data.lifecycle.state.externalRunId;
            if (searchId === undefined) {
                throw Object.assign(
                    new Error("orbit search poll without externalRunId"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "GET",
                path: data.lifecycle.state.data?.statusPath ??
                    "/v3/search/" + encodeURIComponent(searchId),
            });
            if (res.status === 408 || res.status === 429 || res.status >= 500) {
                // The status LOOKUP failed, not the search. Orbit's error
                // guide puts 429 and every temporary server failure in one
                // retry class, so the whole 5xx range is held — a 502 was
                // observed mid-build. The search keeps running and keeps
                // drawing credits, so settling here would abandon work Orbit
                // still bills. `Retry-After` is in SECONDS; an absent or
                // malformed header falls back to a fixed backoff, clamped so
                // a bad value cannot stall the run. Bounded by runMs.
                const after = Number(res.headers["retry-after"]);
                const pollAfterMs = Number.isFinite(after) && after > 0
                    ? Math.min(Math.max(after * 1000, 1_000), 120_000)
                    : 15_000;
                logger.warn("orbit search status lookup transient", {
                    searchId,
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
            if (
                !Array.isArray(utils.json.optionalGet(res.body, "$.results"))
            ) {
                throw new Error("Orbit search snapshot carried no results");
            }
            const status = utils.json.optionalGet(res.body, "$.status");
            const receipt = utils.json.optionalGet(
                res.body,
                "$.billing.status",
            );
            if (status === "running" || receipt === "open") {
                // Two minutes in, this is a build rather than a lookup, and
                // builds run for tens of minutes: fifteen seconds a tick.
                return data.lifecycle.state.timing.attempts > 24
                    ? { kind: "RUNNING", pollAfterMs: 15_000 }
                    : { kind: "RUNNING" };
            }
            if (status === "failed") {
                // The SEARCH failed while the status route answered 200 —
                // ours/theirs (design D12), shaped like Orbit's own error
                // envelope so the provider's fromError reads it.
                logger.warn("orbit search failed", { searchId });
                const failure = utils.json.optionalGet(
                    res.body,
                    "$.candidate_discovery_failure",
                );
                const message = utils.json.optionalGet(
                    failure ?? null,
                    "$.message",
                );
                const code = utils.json.optionalGet(failure ?? null, "$.code");
                return {
                    kind: "COMPLETED",
                    httpStatus: 500,
                    providerHttpStatus: 200,
                    output: {
                        status: "failed",
                        error: {
                            code: typeof code === "string"
                                ? code
                                : "search_failed",
                            message:
                                typeof message === "string" && message !== ""
                                    ? message
                                    : "Orbit search failed",
                        },
                        search_id: searchId,
                    },
                };
            }
            // `completed` and `completed_with_errors` both DELIVERED people,
            // and Orbit charges for what it delivered.
            logger.info("orbit search settled", {
                searchId,
                status: String(status),
            });
            return { kind: "COMPLETED", httpStatus: 200, output: res.body };
        },
    },
    usage: {
        /** Metered in Orbit's own credits: a search settles a mix of cached
         *  blocks, discoveries and builds, Orbit totals it on the receipt,
         *  and the provider's evidence reads that total. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "people search",
            description:
                "what the search drew, as Orbit's own receipt totals it: " +
                "cached results in blocks of ten, discovered people, and " +
                "profiles built to the depth asked for",
        },
        /** THE CEILING the caller authorized, from the published card: one
         *  credit per ten cached results, plus the depth rate for every
         *  person the search may return — a discovered person Orbit builds
         *  is charged as the build, so discovery is not counted on top. */
        estimate: ({ data }) => {
            // Orbit's documented defaults, again: a union arm's `default`
            // is shown, never filled.
            const body = data.input.body;
            const limit = body.limit ?? 20;
            const discovered = (body.candidate_discovery ?? false)
                ? body.candidate_discovery_limit ?? 10
                : 0;
            const rate = (body.profile_depth ?? "partial") === "full" ? 10 : 5;
            return {
                counts: {
                    CREDIT: Math.ceil(limit / 10) + (limit + discovered) * rate,
                },
            };
        },
    },
});
