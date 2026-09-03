import { defineProvider, presets } from "@shared/core";

/**
 * Apify — the canonical ASYNC provider (monid-services' reference example):
 * the whole actor-run lifecycle lives ONCE here at provider level (the v2
 * form of v1's `actorRunLifecycle(actorId)` attached to every def), and
 * every endpoint reduces to pure data — meta + start request (actorId baked
 * into the path) + input schema.
 *
 * Ported 1:1 from monid-services `adaptors/apify/endpoints/actor-run.ts`:
 *   - start: POST the endpoint's request (`/v2/acts/{owner~name}/runs`) —
 *     Apify API errors (non-2xx) are DATA (completed, zero-billed by the
 *     engine); a 2xx without a run id is an Apify contract violation
 *     (throw → EXECUTION_FAILED); else park with {runId, datasetId} state.
 *   - poll: GET /v2/actor-runs/{id} — no exitCode → still running;
 *     SUCCEEDED → fetch the default dataset's items (the BARE item array)
 *     and stash the pricing signals in state for settle; actor failure →
 *     synthesized 500 error-as-data (the engine zero-bills it).
 *   - stop: best-effort POST /v2/actor-runs/{id}/abort — non-2xx expected
 *     for already-terminal runs (logged, ignored; the engine swallows the
 *     rest).
 *   - usage.consolidate (ONE fn for every endpoint): units = dataset item
 *     count; cost = the v1 `actualCostFromPricing` math over the
 *     poll-stashed state signals (PRICE_PER_DATASET_ITEM: perUnit × items;
 *     PAY_PER_EVENT: usageTotalUsd; other models → no cost, evidence only).
 */
export default defineProvider({
    name: "apify",
    meta: {
        displayName: "Apify",
        summary:
            "Run Apify actors — hosted web scrapers for social, maps, jobs, and commerce data.",
        description:
            "Run Apify actors: hosted web scrapers and automation programs " +
            "covering LinkedIn, Instagram, X (Twitter), YouTube, Google " +
            "Maps, and hundreds of other sources. Each endpoint starts one " +
            "actor run with a typed input, polls it to completion, and " +
            "returns the run's dataset items. Runs are asynchronous — " +
            "typical completion is seconds to a few minutes depending on " +
            "the actor and requested volume.",
        homepageUrl: "https://apify.com",
        docsUrl: "https://docs.apify.com/api/v2",
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.apify.com" },
    // mirrors services/workflows/endpointExecution/config.yml (apify):
    // request 30s, run 300s, poll every 2s
    timeouts: { requestMs: 30_000, runMs: 300_000, pollMs: 2_000 },
    lifecycle: {
        start: async ({ data, utils }) => {
            utils.log.info("starting apify actor run", {
                url: data.request.url,
            });
            const res = await utils.http({
                method: data.request.method,
                url: data.request.url,
                body: data.input.body ?? {},
            });
            if (res.status < 200 || res.status >= 300) {
                // Apify API error (actor not found, rate limit) — DATA.
                return {
                    kind: "completed",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const runId = utils.json.optionalGet(res.body, "$.data.id");
            if (typeof runId !== "string" || runId === "") {
                // 2xx without a run id: Apify contract violation → infra.
                throw new Error("Apify did not return a run id");
            }
            const datasetId = utils.json.optionalGet(
                res.body,
                "$.data.defaultDatasetId",
            );
            return {
                kind: "running",
                providerRunId: runId,
                state: {
                    runId,
                    ...(typeof datasetId === "string" ? { datasetId } : {}),
                },
            };
        },
        poll: async ({ data, utils }) => {
            const runId = String(utils.json.get(data.state, "$.runId"));
            const res = await utils.http({
                method: "GET",
                path: "/v2/actor-runs/" + encodeURIComponent(runId),
            });
            if (res.status < 200 || res.status >= 300) {
                // Apify API error during polling — DATA.
                return {
                    kind: "completed",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const exitCode = utils.json.optionalNum(
                res.body,
                "$.data.exitCode",
            );
            if (exitCode === undefined) {
                return { kind: "running", state: data.state };
            }
            const status = utils.json.optionalGet(res.body, "$.data.status");
            if (exitCode === 0 && status === "SUCCEEDED") {
                const datasetId = utils.json.optionalGet(
                    res.body,
                    "$.data.defaultDatasetId",
                ) ?? utils.json.optionalGet(data.state, "$.datasetId");
                if (typeof datasetId !== "string" || datasetId === "") {
                    throw new Error("Apify run has no default dataset id");
                }
                const items = await utils.http({
                    method: "GET",
                    path: "/v2/datasets/" + encodeURIComponent(datasetId) +
                        "/items",
                });
                if (items.status < 200 || items.status >= 300) {
                    return {
                        kind: "completed",
                        httpStatus: items.status,
                        output: items.body,
                    };
                }
                // pricing signals for settle — the run record does not ride
                // the dataset body, so they thread through state
                const model = utils.json.optionalGet(
                    res.body,
                    "$.data.pricingInfo.pricingModel",
                );
                const perUnit = utils.json.optionalNum(
                    res.body,
                    "$.data.pricingInfo.pricePerUnitUsd",
                );
                const totalUsd = utils.json.optionalNum(
                    res.body,
                    "$.data.usageTotalUsd",
                );
                return {
                    kind: "completed",
                    httpStatus: 200,
                    output: Array.isArray(items.body) ? items.body : [],
                    state: {
                        runId,
                        datasetId,
                        ...(typeof model === "string"
                            ? { pricingModel: model }
                            : {}),
                        ...(perUnit !== undefined
                            ? { pricePerUnitUsd: perUnit }
                            : {}),
                        ...(totalUsd !== undefined
                            ? { usageTotalUsd: totalUsd }
                            : {}),
                    },
                };
            }
            // actor failed (exit code ≠ 0) — synthesized 500 error-as-data;
            // the engine zero-bills every non-2xx envelope.
            const message = utils.json.optionalGet(
                res.body,
                "$.data.statusMessage",
            );
            utils.log.warn("apify actor run failed", { runId, exitCode });
            return {
                kind: "completed",
                httpStatus: 500,
                output: {
                    message: typeof message === "string" && message !== ""
                        ? message
                        : "Actor failed with exit code " + String(exitCode),
                },
            };
        },
        stop: async ({ data, utils }) => {
            const runId = String(utils.json.get(data.state, "$.runId"));
            const res = await utils.http({
                method: "POST",
                path: "/v2/actor-runs/" + encodeURIComponent(runId) +
                    "/abort",
            });
            if (res.status < 200 || res.status >= 300) {
                // already-terminal runs / transient API errors are expected
                utils.log.warn("apify abort failed (best-effort, ignored)", {
                    runId,
                    status: res.status,
                });
            }
        },
    },
    usage: {
        consolidate: ({ data, utils }) => {
            const items = Array.isArray(data.output) ? data.output.length : 0;
            const state = data.state ?? null;
            const model = utils.json.optionalGet(state, "$.pricingModel");
            const perUnit = utils.json.optionalNum(
                state,
                "$.pricePerUnitUsd",
            );
            const totalUsd = utils.json.optionalNum(state, "$.usageTotalUsd");
            // v1 actualCostFromPricing: PRICE_PER_DATASET_ITEM multiplies,
            // PAY_PER_EVENT reads the reported total, other models → no cost
            const cost = model === "PRICE_PER_DATASET_ITEM"
                ? utils.money.fromDollars((perUnit ?? 0) * items)
                : model === "PAY_PER_EVENT"
                ? utils.money.fromDollars(totalUsd ?? 0)
                : undefined;
            return {
                usage: {
                    units: [{ amount: items, unit: "result" }],
                    ...(cost !== undefined ? { cost } : {}),
                    evidence: utils.json.pick(state, [
                        "$.runId",
                        "$.pricingModel",
                        "$.pricePerUnitUsd",
                        "$.usageTotalUsd",
                    ]),
                },
            };
        },
    },
});
