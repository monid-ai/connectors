import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstagramApiScraperBody } from "./schema/inputs.ts";
import { zInstagramApiScraperOutput } from "./schema/output.ts";

/**
 * apify/instagram-api-scraper — Instagram API. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Instagram API",
        summary: "Scrape Instagram posts, profiles, places, and hashtags " +
            "by URL or search query, no login required.",
        description:
            "Extracts structured Instagram data from profiles, posts " +
            "(including reels and IGTV), hashtags, and locations by " +
            "direct URL or text search query, without login. Returns " +
            "page-level details, media URLs, image/video dimensions, " +
            "captions, hashtags, mentions, engagement metrics " +
            "(likes, comments), timestamps, owner metadata, top " +
            "posts, top comments with replies, and location/tag " +
            "metadata.",
        docsUrl: "https://apify.com/apify/instagram-api-scraper",
        categories: ["instagram"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apify/instagram-api-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apify~instagram-api-scraper/runs",
    },
    input: {
        schema: {
            // TWO alternative run modes bill items: direct-url runs (each
            // directUrls entry yields up to resultsLimit items) and search
            // runs (one `search` query yields up to searchLimit items).
            // The actor publishes NO server default for either limit
            // (prefills 200/1 are editor hints) and accepts absent limits
            // (unbounded) — WE require BOTH limits, the dual-mode PRIMARY
            // knobs: the estimate must be deducible to price the hold
            // (D24/D25). directUrls/search stay the plain optional mirror
            // — no active mode is a genuine zero-item promise.
            body: zInstagramApiScraperBody.required({
                resultsLimit: true,
                searchLimit: true,
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zInstagramApiScraperOutput },
    usage: {
        /** The WHOLE published card (design D29): url-mode items and
         *  search-mode items bill at DIFFERENT rates (the pre-D29 model
         *  lumped search items under `result` 0.0014 while the vendor
         *  bills them at `search-result` 0.0035 — a real under-hold),
         *  plus the date-filter add-on the `onlyPostsNewerThan` input
         *  switches on. Ids normalize from the actor's event names
         *  (D28); Business-tier rates, survey-pinned. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.001 },
                },
                result: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "URL results",
                    description: "items scraped from directUrls entries",
                    consumes: { credit: "default", amount: 0.0014 },
                },
                search_result: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "search results",
                    description: "items found by the `search` query — " +
                        "billed at their own, higher rate",
                    consumes: { credit: "default", amount: 0.0035 },
                },
                filter_applied: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "date-filtered posts",
                    description: "surcharge per post scraped with the " +
                        "onlyPostsNewerThan date filter",
                    consumes: { credit: "default", amount: 0.0007 },
                },
            },
        },
        /** Dual-mode promise, each mode under ITS OWN rate line:
         *  resultsLimit × directUrls entries → `result`; searchLimit ×
         *  one query when `search` is set → `search_result`. Both limits
         *  are required at the binding; an absent directUrls / search is
         *  a genuine zero-term mode — pure arithmetic (D24). The
         *  date-filter surcharge applies per POST when
         *  onlyPostsNewerThan is set — promised at the url-mode cap
         *  (posts ride directUrls runs). */
        estimate: ({ data }) => {
            const body = data.input.body;
            const urlItems = body.resultsLimit *
                (body.directUrls?.length ?? 0);
            const searchItems = body.searchLimit *
                (body.search !== undefined ? 1 : 0);
            return {
                counts: {
                    ...(urlItems > 0 ? { result: urlItems } : {}),
                    ...(searchItems > 0 ? { search_result: searchItems } : {}),
                    ...(body.onlyPostsNewerThan !== undefined && urlItems > 0
                        ? { filter_applied: urlItems }
                        : {}),
                },
            };
        },
        /** OVERRIDES the provider evidence (≥2 metered lines): delivered
         *  items split by the mode that produced them — the search mode
         *  yields exactly one query's items, so with both modes active
         *  the split is deducible only mode-by-mode; we attribute by the
         *  ACTIVE mode (single-mode runs are exact; the D27 claim is the
         *  credits truth regardless). date_filter counts url-mode items
         *  when the date input was set. */
        evidence: ({ data, utils }) => {
            const items = Array.isArray(data.output) ? data.output.length : 0;
            const body = data.input.body ?? {};
            const searching =
                utils.json.optionalGet(body, "$.search") !== undefined;
            const urlMode =
                (utils.json.optionalLen(body, "$.directUrls") ?? 0) > 0;
            const dated =
                utils.json.optionalGet(body, "$.onlyPostsNewerThan") !==
                    undefined;
            // both modes active: attribute to the url-mode line (the
            // cheaper rate — conservative for OUR evidence; the vendor's
            // claim settles the actual bill either way)
            const key = urlMode || !searching ? "result" : "search_result";
            return {
                counts: {
                    [key]: items,
                    ...(dated && urlMode ? { filter_applied: items } : {}),
                },
            };
        },
    },
});
