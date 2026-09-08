import { z } from "zod";
import { defineProvider, presets } from "@shared/core";

/**
 * Apify — the canonical ASYNC provider (monid-services' reference example):
 * the whole actor-run lifecycle lives ONCE here at provider level (the v2
 * form of v1's `actorRunLifecycle(actorId)` attached to every def), and
 * every endpoint reduces to pure data — meta + start request (actorId baked
 * into the path) + input schema (+ a usage.model/estimate declaration).
 *
 * Ported 1:1 from monid-services `adaptors/apify/endpoints/actor-run.ts`:
 *   - start: POST the endpoint's request (`/v2/acts/{owner~name}/runs`) —
 *     Apify API errors (non-2xx) are DATA (COMPLETED, zero-billed by the
 *     engine); a 2xx without a run id is an Apify contract violation
 *     (throw → EXECUTION_FAILED); else park with `externalRunId` + the
 *     dataset id stashed in the typed `data` bag.
 *   - poll: GET /v2/actor-runs/{id} — no exitCode → still RUNNING (`{}`
 *     patch keeps the previous state); SUCCEEDED → fetch the default
 *     dataset's items (the BARE item array) and stash the pricing signals
 *     (incl. the live per-event rates) in `data` for settle; actor failure
 *     → synthesized 500 error-as-data (the engine zero-bills it).
 *   - stop: best-effort POST /v2/actor-runs/{id}/abort — non-2xx expected
 *     for already-terminal runs (logged, ignored; the engine swallows the
 *     rest).
 *   - usage.consolidate (ONE fn for every endpoint): count = dataset item
 *     count; cost = the v1 `actualCostFromPricing` math over the
 *     poll-stashed `state.data` signals (PRICE_PER_DATASET_ITEM: perUnit ×
 *     items; PAY_PER_EVENT: usageTotalUsd; other models → no cost,
 *     evidence only).
 *
 * TYPED STATE (`lifecycle.state` → doc.lifecycle.stateSchema): the shape of
 * the fn-owned `data` bag every endpoint inherits — engine-validated each
 * tick. Endpoints overriding poll/consolidate with extra signals extend it
 * (linkedin-profile-search).
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
        state: z.strictObject({
            /** Default dataset id — the results fetch target. */
            datasetId: z.string().min(1).optional(),
            /** Run-record pricing signals stashed at the terminal poll. */
            pricingModel: z.string().optional(),
            pricePerUnitUsd: z.number().optional(),
            usageTotalUsd: z.number().optional(),
            /** The run record's LIVE pricingPerEvent.actorChargeEvents,
             *  stashed VERBATIM (eventName → {eventPriceUsd, …}) — the
             *  settle-side rate source for PAY_PER_EVENT actors (constants
             *  are fallback only; read e.g.
             *  `$.data.pricingPerEvent.search-page.eventPriceUsd`). */
            pricingPerEvent: z.record(
                z.string(),
                z.looseObject({ eventPriceUsd: z.number().optional() }),
            ).optional(),
            /** linkedin-profile-search reconstruction (page-basis billing). */
            searchPages: z.number().int().nonnegative().optional(),
            profileCount: z.number().int().nonnegative().optional(),
        }),
        start: async ({ data, utils, logger }) => {
            logger.info("starting apify actor run", {
                url: data.request.url,
            });
            // the DEFAULT RELAY: method/url/headers from the compiled
            // request, body/queryParams from the caller input
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                // Apify API error (actor not found, rate limit) — DATA.
                return {
                    kind: "COMPLETED",
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
                kind: "RUNNING",
                state: {
                    // the vendor's run id — the correlation handle hosts
                    // read (↔ v1 providerRunId)
                    externalRunId: runId,
                    ...(typeof datasetId === "string" && datasetId !== ""
                        ? { data: { datasetId } }
                        : {}),
                },
            };
        },
        poll: async ({ data, utils, logger }) => {
            const runId = String(
                utils.json.get(data.state, "$.externalRunId"),
            );
            const res = await utils.http({
                method: "GET",
                path: "/v2/actor-runs/" + encodeURIComponent(runId),
            });
            if (res.status < 200 || res.status >= 300) {
                // Apify API error during polling — DATA.
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const exitCode = utils.json.optionalNum(
                res.body,
                "$.data.exitCode",
            );
            if (exitCode === undefined) {
                // still running — `{}` inherits the previous state
                return { kind: "RUNNING", state: {} };
            }
            const status = utils.json.optionalGet(res.body, "$.data.status");
            if (exitCode === 0 && status === "SUCCEEDED") {
                const datasetId = utils.json.optionalGet(
                    res.body,
                    "$.data.defaultDatasetId",
                ) ?? utils.json.optionalGet(data.state, "$.data.datasetId");
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
                        kind: "COMPLETED",
                        httpStatus: items.status,
                        output: items.body,
                    };
                }
                // pricing signals for settle — the run record does not ride
                // the dataset body, so they thread through state.data
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
                // LIVE per-event rates — the run record's actorChargeEvents
                // VERBATIM: the settle-side rate source for PAY_PER_EVENT
                // actors (constants are fallback only)
                const events = utils.json.optionalGet(
                    res.body,
                    "$.data.pricingInfo.pricingPerEvent.actorChargeEvents",
                );
                return {
                    kind: "COMPLETED",
                    httpStatus: 200,
                    output: Array.isArray(items.body) ? items.body : [],
                    state: {
                        externalRunId: runId,
                        data: {
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
                            ...(events !== undefined && events !== null &&
                                    typeof events === "object" &&
                                    !Array.isArray(events)
                                ? { pricingPerEvent: events }
                                : {}),
                        },
                    },
                };
            }
            // actor failed (exit code ≠ 0) — synthesized 500 error-as-data;
            // the engine zero-bills every non-2xx envelope.
            const message = utils.json.optionalGet(
                res.body,
                "$.data.statusMessage",
            );
            logger.warn("apify actor run failed", { runId, exitCode });
            return {
                kind: "COMPLETED",
                // OURS synthesized (the ACTOR failed) / THEIRS was a 200
                // (the poll exchange itself succeeded) — design D12
                httpStatus: 500,
                providerHttpStatus: 200,
                output: {
                    message: typeof message === "string" && message !== ""
                        ? message
                        : "Actor failed with exit code " + String(exitCode),
                },
            };
        },
        stop: async ({ data, utils, logger }) => {
            const runId = String(
                utils.json.get(data.state, "$.externalRunId"),
            );
            const res = await utils.http({
                method: "POST",
                path: "/v2/actor-runs/" + encodeURIComponent(runId) +
                    "/abort",
            });
            if (res.status < 200 || res.status >= 300) {
                // already-terminal runs / transient API errors are expected
                logger.warn("apify abort failed (best-effort, ignored)", {
                    runId,
                    status: res.status,
                });
            }
        },
    },
    output: {
        // THE error-digestion hook (design D12) — v1's per-call-site
        // apifyErrorBody normalization as ONE provider-level projection:
        // runs only on provider-error envelopes, after zero-usage forcing.
        // Handles both shapes — the Apify API error envelope ({error:
        // {message, type}}) and lifecycle-synthesized bodies ({message}) —
        // and keeps the raw body under `raw` (digest, never hide).
        fromError: ({ data, utils }) => {
            const nested = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const flat = utils.json.optionalGet(data.output, "$.message");
            const type = utils.json.optionalGet(data.output, "$.error.type");
            const message = typeof nested === "string"
                ? nested
                : typeof flat === "string"
                ? flat
                : "Apify API error";
            return {
                message,
                ...(typeof type === "string" ? { type } : {}),
                raw: data.output,
            };
        },
    },
    usage: {
        // No provider-level model/estimate defaults: every ENDPOINT declares
        // its own — the cost shape and the estimate fields are per-actor
        // facts, pinned beside the input schema that defines them.
        consolidate: ({ data, utils }) => {
            const items = Array.isArray(data.output) ? data.output.length : 0;
            const state = data.state ?? null;
            // counts KEY from the doc's OWN model (design D19): leaf → the
            // unit; composite → the sole metered component id — which for
            // apify is the actor's charge-event name VERBATIM, so counts,
            // card and vendor truth join on one string. Single-valued by
            // the compiler's ≥2-metered rule (multi-metered actors declare
            // their own fns).
            const usageModel = data.model;
            const key = usageModel?.kind === "PER_UNIT"
                ? usageModel.unit
                : usageModel?.kind === "COMPOSITE"
                ? Object.entries(usageModel.components)
                    .find(([, component]) => component.kind === "PER_UNIT")
                    ?.[0]
                : undefined;
            const model = utils.json.optionalGet(
                state,
                "$.data.pricingModel",
            );
            const perUnit = utils.json.optionalNum(
                state,
                "$.data.pricePerUnitUsd",
            );
            const totalUsd = utils.json.optionalNum(
                state,
                "$.data.usageTotalUsd",
            );
            // v1 actualCostFromPricing: PRICE_PER_DATASET_ITEM multiplies,
            // PAY_PER_EVENT reads the reported total, other models → no cost
            const cost = model === "PRICE_PER_DATASET_ITEM"
                ? utils.money.fromDollars((perUnit ?? 0) * items)
                : model === "PAY_PER_EVENT"
                ? utils.money.fromDollars(totalUsd ?? 0)
                : undefined;
            return {
                usage: {
                    counts: key === undefined ? {} : { [key]: items },
                    ...(cost !== undefined ? { cost } : {}),
                    evidence: utils.json.pick(state, [
                        "$.externalRunId",
                        "$.data.pricingModel",
                        "$.data.pricePerUnitUsd",
                        "$.data.usageTotalUsd",
                    ]),
                },
            };
        },
    },
});
