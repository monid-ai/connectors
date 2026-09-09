import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinProfileSearchBody } from "./schema/inputs.ts";

/**
 * harvestapi/linkedin-profile-search — Search LinkedIn Profiles. THE
 * leaf-wise-override showcase: this endpoint REPLACES the provider's poll
 * and evidence (inheriting start/stop/fromError untouched) because its
 * billing basis is SEARCH PAGES, not dataset items.
 *
 * Ported 1:1 from v1 (`linkedin/linkedin-profile-search.ts`):
 *   - Apify bills this PAY_PER_EVENT actor on TWO quanta: a per-search-page
 *     charge (all modes) + a per-profile charge in the Full modes ("Short"
 *     adds none). RATES ARE READ LIVE from the run record's
 *     pricingPerEvent.actorChargeEvents (search-page / full-profile /
 *     full-profile-with-email eventPriceUsd) — v1's baked constants had
 *     drifted ($0.10 vs the live $0.05 page rate), exactly the failure mode
 *     run-record rates eliminate. The port-time observations ($0.05 /
 *     $0.0032 / $0.008) remain as FALLBACK only.
 *   - Pages scraped is not reported, but IS reconstructible from the exact
 *     PAY_PER_EVENT total: pages = round((usageTotalUsd − profiles ×
 *     perProfileRate) / pageRate), clamped so a run that returned profiles is
 *     never attributed zero pages (v1 `reconstructSearchPages`).
 *   - The poll override stamps the reconstruction ONTO the output
 *     (`{searchPages, profileCount, profiles}`) — the counts users are
 *     billed on are the counts they can see.
 *   - The evidence override settles counts keyed by the actor's OWN
 *     charge events (design D19): "search-page" (a successful zero-profile
 *     run still scraped ≥1 charged page — page-basis keeps it billable)
 *     plus the profile count under the MODE-selected component
 *     ("full-profile" / "full-profile-with-email"; "Short" adds none).
 *
 * NOT ported (hosted concerns): the tiered price card. The v1 admission
 * rules live in the schema instead: `profileScraperMode` is REQUIRED in
 * the input schema, and `maxItems` is required ≥1 at the binding (D24) —
 * an unbounded run means ~2,500 profiles per query to this actor, so the
 * estimate must be deducible before holding.
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
            "emails. `maxItems` (profile cap) is required — without a " +
            "bound the actor fetches up to ~2,500 profiles per query; " +
            "`takePages` optionally caps 25-profile pages. Returns " +
            "`{searchPages, profileCount, profiles}` so the billed page " +
            "and profile counts ride the output. Runs asynchronously.",
        docsUrl: "https://apify.com/harvestapi/linkedin-profile-search",
        categories: ["linkedin", "people-enrichment"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/harvestapi/linkedin-profile-search",
    request: {
        method: "POST",
        path: "/v2/acts/harvestapi~linkedin-profile-search/runs",
    },
    input: {
        schema: {
            // the actor accepts an absent maxItems (scrapes unbounded —
            // ~2,500 profiles per query; prefill 20 is editor-only, NOT a
            // server default) and reads a non-positive limit as "no limit"
            // — WE require it ≥1: the estimate must be deducible to price
            // the hold (D24). maxItems is the PRIMARY bound (v1 DUAL_LIMIT
            // probes it first); takePages stays optional and no longer
            // feeds the estimate.
            body: zLinkedinProfileSearchBody.extend({
                maxItems: zLinkedinProfileSearchBody.shape.maxItems
                    .unwrap().min(1),
            }),
        },
    },
    lifecycle: {
        // OVERRIDES the provider poll: same actor-run protocol, plus the
        // page reconstruction stamped onto the output + state.data.
        poll: async ({ data, utils, logger }) => {
            const runId = String(
                utils.json.get(data.lifecycle.state, "$.externalRunId"),
            );
            const res = await utils.http({
                method: "GET",
                path: "/v2/actor-runs/" + encodeURIComponent(runId),
            });
            if (res.status < 200 || res.status >= 300) {
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
                // absent state — the previous fn-state carries forward (D21)
                return { kind: "RUNNING" };
            }
            const status = utils.json.optionalGet(res.body, "$.data.status");
            if (exitCode === 0 && status === "SUCCEEDED") {
                const datasetId = utils.json.optionalGet(
                    res.body,
                    "$.data.defaultDatasetId",
                ) ??
                    utils.json.optionalGet(
                        data.lifecycle.state,
                        "$.data.datasetId",
                    );
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
                const profiles = Array.isArray(items.body) ? items.body : [];
                const totalUsd = utils.json.optionalNum(
                    res.body,
                    "$.data.usageTotalUsd",
                );
                // LIVE RATES from the run record's charge events (finding 5:
                // v1-style baked constants drift; the run record is truth) —
                // port-time observations remain as fallback only.
                const chargeEvents =
                    "$.data.pricingInfo.pricingPerEvent.actorChargeEvents";
                const pageRate = utils.json.optionalNum(
                    res.body,
                    chargeEvents + ".search-page.eventPriceUsd",
                ) ?? 0.05;
                // typed mode read (D23): the body is z.output of the doc's
                // own schema — profileScraperMode is a required enum, so
                // the v1 "unreadable mode" degradation path is dead
                const mode = data.input.body.profileScraperMode;
                const perProfile = mode === "Full"
                    ? (utils.json.optionalNum(
                        res.body,
                        chargeEvents + ".full-profile.eventPriceUsd",
                    ) ?? 0.0032)
                    : mode === "Full + email search"
                    ? (utils.json.optionalNum(
                        res.body,
                        chargeEvents + ".full-profile-with-email.eventPriceUsd",
                    ) ?? 0.008)
                    : 0;
                // v1 reconstructSearchPages: exact PAY_PER_EVENT total minus
                // the profile charges, divided by the LIVE page rate;
                // clamped ≥1 when profiles came back, degraded to 0/1 on a
                // missing usage total (money follows evidence)
                const floor = profiles.length > 0 ? 1 : 0;
                const searchPages = typeof totalUsd === "number" && totalUsd > 0
                    ? Math.max(
                        Math.round(
                            (totalUsd - profiles.length * perProfile) /
                                pageRate,
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
                    kind: "COMPLETED",
                    httpStatus: 200,
                    output,
                    state: {
                        externalRunId: runId,
                        data: {
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
                    },
                };
            }
            const message = utils.json.optionalGet(
                res.body,
                "$.data.statusMessage",
            );
            logger.warn("apify actor run failed", { runId, exitCode });
            return {
                kind: "COMPLETED",
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
        /** The actor's EXACT published charge events as keyed components
         *  (design D19; verified live): a per-page charge in every mode,
         *  plus a per-profile charge whose RATE is selected by the input's
         *  profileScraperMode — a select-one is just a composite whose fn
         *  populates only the selected key ("Short" adds none). THREE
         *  metered components ⇒ the compiler requires this doc to own both
         *  fns (the generic keying can't choose). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                search_page: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "search pages",
                    description: "search pages scraped (charged in every mode)",
                    // survey-pinned GOLD-tier event price
                    consumes: { credit: "default", amount: 0.05 },
                },
                full_profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "full profiles",
                    description: "profiles enriched in 'Full' mode",
                    consumes: { credit: "default", amount: 0.0032 },
                },
                full_profile_with_email: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "profiles with email",
                    description:
                        "profiles enriched in 'Full + email search' mode",
                    consumes: { credit: "default", amount: 0.008 },
                },
            },
        },
        /** maxItems is required ≥1 at the binding (D24), so both quanta are
         *  pure arithmetic: pages = ceil(maxItems/25) (the actor's
         *  documented 25 profiles per page, v1 DUAL_LIMIT constant) and the
         *  profile count = maxItems, keyed by the mode the pinned input
         *  SELECTS ("Short": page rate only). */
        estimate: ({ data }) => {
            const body = data.input.body;
            const pages = Math.ceil(body.maxItems / 25);
            const profileKey = body.profileScraperMode === "Full"
                ? "full_profile"
                : body.profileScraperMode === "Full + email search"
                ? "full_profile_with_email"
                : undefined;
            return {
                counts: {
                    "search_page": pages,
                    ...(profileKey !== undefined
                        ? { [profileKey]: body.maxItems }
                        : {}),
                },
            };
        },
        // OVERRIDES the provider evidence (design D27): billing basis =
        // SEARCH PAGES (v1: a zero-profile run still bills its ≥1 charged
        // pages); profiles land under the MODE-selected line, priced at
        // exactly the pinned per-event rate.
        evidence: ({ data, utils }) => {
            const pages = utils.json.optionalNum(
                data.output,
                "$.searchPages",
            ) ?? 0;
            const profiles = utils.json.optionalNum(
                data.output,
                "$.profileCount",
            ) ?? 0;
            const mode = utils.json.optionalGet(
                data.input.body ?? null,
                "$.profileScraperMode",
            );
            const profileKey = mode === "Full"
                ? "full_profile"
                : mode === "Full + email search"
                ? "full_profile_with_email"
                : undefined;
            // quantities only (D27) — the vendor's usageTotalUsd claim is
            // the provider consolidate's job
            return {
                counts: {
                    "search_page": pages,
                    ...(profileKey !== undefined && profiles > 0
                        ? { [profileKey]: profiles }
                        : {}),
                },
            };
        },
    },
});
