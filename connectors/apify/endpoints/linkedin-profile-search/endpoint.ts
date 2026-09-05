import { defineEndpoint } from "@shared/core";
import { zLinkedinProfileSearchBody } from "./schema/inputs.ts";

/**
 * harvestapi/linkedin-profile-search — Search LinkedIn Profiles. THE
 * leaf-wise-override showcase: this endpoint REPLACES the provider's poll
 * and consolidate (inheriting start/stop/fromError untouched) because its
 * billing basis is SEARCH PAGES, not dataset items.
 *
 * Ported 1:1 from v1 (`linkedin/linkedin-profile-search.ts`):
 *   - Apify bills this PAY_PER_EVENT actor on TWO quanta: a per-search-page
 *     charge (all modes) + a per-profile charge in the Full modes ("Short"
 *     adds none). RATES REFRESHED at port time from the actor's live
 *     pricingPerEvent (recorded in the happy fixture): search-page $0.05,
 *     full-profile $0.0032, full-profile-with-email $0.008 — v1's constants
 *     ($0.10/$0.004/$0.01) had drifted, the exact re-verify trigger v1's
 *     decision record named. Re-verify again when a settle shows
 *     calculatedCost != actualCost.
 *   - Pages scraped is not reported, but IS reconstructible from the exact
 *     PAY_PER_EVENT total: pages = round((usageTotalUsd − profiles ×
 *     perProfileRate) / pageRate), clamped so a run that returned profiles is
 *     never attributed zero pages (v1 `reconstructSearchPages`).
 *   - The poll override stamps the reconstruction ONTO the output
 *     (`{searchPages, profileCount, profiles}`) — the counts users are
 *     billed on are the counts they can see.
 *   - The consolidate override settles units = search pages (a successful
 *     zero-profile run still scraped ≥1 charged page — page-basis keeps it
 *     billable) + profiles as a second measure.
 *
 * NOT ported (hosted concerns): the tiered price card, the maxItems/
 * takePages admission estimate (an unbounded run means ~2,500 profiles per
 * query to this actor — hosts should require a bound before holding).
 * `profileScraperMode` is REQUIRED in the input schema (the v1 admission
 * rule, declaratively).
 */
export default defineEndpoint({
    meta: {
        displayName: "Search LinkedIn Profiles",
        summary:
            "Search LinkedIn profiles with the full people-search filter set; billed per search page plus per profile in Full modes.",
        description:
            "Searches LinkedIn profiles with the full people-search filter " +
            "set (query, locations, current companies, job titles, " +
            "industries, and more) plus automatic query segmentation for " +
            "broad searches. `profileScraperMode` is required and priced " +
            "separately: 'Short' returns search-card data, 'Full' enriches " +
            "each profile, 'Full + email search' additionally discovers " +
            "emails. Cap the run with `maxItems` (profiles) or `takePages` " +
            "(pages of up to 25 profiles) — without a bound the actor " +
            "fetches up to ~2,500 profiles per query. Returns " +
            "`{searchPages, profileCount, profiles}` so the billed page " +
            "and profile counts ride the output. Runs asynchronously.",
        docsUrl: "https://apify.com/harvestapi/linkedin-profile-search",
        categories: ["linkedin", "people-enrichment"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/harvestapi~linkedin-profile-search/runs",
    },
    input: { schema: { body: zLinkedinProfileSearchBody } },
    lifecycle: {
        // OVERRIDES the provider poll: same actor-run protocol, plus the
        // page reconstruction stamped onto the output + state.
        poll: async ({ data, utils, logger }) => {
            const runId = String(
                utils.json.get(data.state, "$.externalRunId"),
            );
            const res = await utils.http({
                method: "GET",
                path: "/v2/actor-runs/" + encodeURIComponent(runId),
            });
            if (res.status < 200 || res.status >= 300) {
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
                const profiles = Array.isArray(items.body) ? items.body : [];
                const totalUsd = utils.json.optionalNum(
                    res.body,
                    "$.data.usageTotalUsd",
                );
                // loose mode read (v1 `readScraperMode`): an unreadable mode
                // degrades the math to the $0 per-profile rate, never fails
                const mode = utils.json.optionalGet(
                    data.input.body ?? null,
                    "$.profileScraperMode",
                );
                const perProfile = mode === "Full"
                    ? 0.0032
                    : mode === "Full + email search"
                    ? 0.008
                    : 0;
                // v1 reconstructSearchPages: exact PAY_PER_EVENT total minus
                // the profile charges, divided by the $0.10 page rate;
                // clamped ≥1 when profiles came back, degraded to 0/1 on a
                // missing usage total (money follows evidence)
                const floor = profiles.length > 0 ? 1 : 0;
                const searchPages = typeof totalUsd === "number" && totalUsd > 0
                    ? Math.max(
                        Math.round(
                            (totalUsd - profiles.length * perProfile) /
                                0.1,
                        ),
                        floor,
                    )
                    : floor;
                const model = utils.json.optionalGet(
                    res.body,
                    "$.data.pricingInfo.pricingModel",
                );
                // merge widens the literal to Json (fn bodies are executable
                // JS — no TS annotations allowed in closed terms)
                const output = utils.json.merge(
                    { searchPages, profileCount: profiles.length },
                    { profiles },
                );
                return {
                    kind: "completed",
                    httpStatus: 200,
                    output,
                    state: {
                        externalRunId: runId,
                        datasetId,
                        searchPages,
                        profileCount: profiles.length,
                        ...(typeof model === "string"
                            ? { pricingModel: model }
                            : {}),
                        ...(totalUsd !== undefined
                            ? { usageTotalUsd: totalUsd }
                            : {}),
                    },
                };
            }
            const message = utils.json.optionalGet(
                res.body,
                "$.data.statusMessage",
            );
            logger.warn("apify actor run failed", { runId, exitCode });
            return {
                kind: "completed",
                httpStatus: 500,
                providerHttpStatus: 200,
                output: {
                    message: typeof message === "string" && message !== ""
                        ? message
                        : "Actor failed with exit code " + String(exitCode),
                },
            };
        },
    },
    usage: {
        // OVERRIDES the provider consolidate: billing basis = SEARCH PAGES
        // (v1: a zero-profile run still bills its ≥1 charged pages);
        // profiles ride as a second native measure.
        consolidate: ({ data, utils }) => {
            const state = data.state ?? null;
            const pages = utils.json.optionalNum(
                data.output,
                "$.searchPages",
            ) ?? 0;
            const profiles = utils.json.optionalNum(
                data.output,
                "$.profileCount",
            ) ?? 0;
            const model = utils.json.optionalGet(state, "$.pricingModel");
            const totalUsd = utils.json.optionalNum(
                state,
                "$.usageTotalUsd",
            );
            return {
                usage: {
                    units: [
                        { amount: pages, unit: "page" },
                        { amount: profiles, unit: "result" },
                    ],
                    ...(model === "PAY_PER_EVENT"
                        ? { cost: utils.money.fromDollars(totalUsd ?? 0) }
                        : {}),
                    evidence: utils.json.pick(state, [
                        "$.externalRunId",
                        "$.pricingModel",
                        "$.usageTotalUsd",
                        "$.searchPages",
                        "$.profileCount",
                    ]),
                },
            };
        },
    },
});
