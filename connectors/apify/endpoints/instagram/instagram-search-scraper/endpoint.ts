import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstagramSearchScraperBody } from "./schema/inputs.ts";
import { zInstagramSearchScraperOutput } from "./schema/output.ts";

/**
 * apify/instagram-search-scraper — Search Instagram. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Instagram",
        summary: "Search Instagram for places, profiles, and hashtags by " +
            "keyword.",
        description: "Searches Instagram for places, profiles, and hashtags " +
            "by keyword using discovery sources (Google, Facebook " +
            "Ads, Threads). Returns place metadata (business name, " +
            "category, contact info, address, geocoordinates, " +
            "opening hours), account metadata (username, bio, " +
            "follower/following counts, verification status), " +
            "hashtag metadata (total posts, posts-per-day, " +
            "difficulty, related hashtags), and recent media samples " +
            "with engagement metrics. Suited for finding new places, " +
            "users, trends, and hashtags.",
        docsUrl: "https://apify.com/apify/instagram-search-scraper",
        categories: ["instagram"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apify/instagram-search-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apify~instagram-search-scraper/runs",
    },
    input: {
        schema: {
            // searchLimit is the PRIMARY limiting knob (the actor accepts
            // an absent searchLimit; live schema has prefill 1 only — an
            // editor hint, NOT a server default) — WE require it: the
            // estimate must be deducible to price the hold (D24/D25).
            // search stays the plain actor-required mirror — a string with
            // zero non-empty comma-separated terms is a genuine zero-item
            // promise, not an error.
            body: zInstagramSearchScraperBody.required({ searchLimit: true }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zInstagramSearchScraperOutput },
    usage: {
        /** The WHOLE published card (design D29): standard-search items
         *  and live-search items bill under SEPARATE event lines — the
         *  liveSearch input selects which line a run's dataset writes to
         *  ("the dataset will be slightly different than the one produced
         *  by standard search"); same rate on both. Ids normalize from
         *  the actor's event names (D28); Business-tier rates,
         *  survey-pinned. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                result: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "search results",
                    description: "items found by a standard search",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.0015 },
                },
                live_search_result: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "live search results",
                    description: "items found by a live Instagram search " +
                        "when liveSearch is on",
                    consumes: { credit: "default", amount: 0.0015 },
                },
            },
        },
        /** searchLimit (required at the binding) × comma-separated
         *  `search` TERMS (the actor treats "a,b,c" as three searches —
         *  PR #2 finding). Zero non-empty terms ⇒ estimate 0 — pure
         *  arithmetic (D24), keyed by the line the liveSearch toggle
         *  selects (no published server default — absent means the
         *  standard search). */
        estimate: ({ data }) => {
            const body = data.input.body;
            const terms = body.search
                .split(",").filter((t) => t.trim() !== "").length;
            const results = body.searchLimit * terms;
            const key = body.liveSearch === true
                ? "live_search_result"
                : "result";
            return { counts: { [key]: results } };
        },
        /** OVERRIDES the provider evidence (≥2 metered lines): delivered
         *  items land on the single line the run's liveSearch mode
         *  selected — single-mode by construction, so the split is
         *  exact. */
        evidence: ({ data, utils }) => {
            const items = Array.isArray(data.output) ? data.output.length : 0;
            const live = utils.json.optionalGet(
                data.input.body ?? {},
                "$.liveSearch",
            ) === true;
            return {
                counts: { [live ? "live_search_result" : "result"]: items },
            };
        },
    },
});
