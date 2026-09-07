import { presets } from "@shared/core";

/**
 * Apify estimation — the v1 EstimationLabel machinery, v2 form: the field
 * allow-lists live ONCE here (v1 limit-resolver.ts: "when Apify changes a
 * field name on an actor, we update one allow-list, not every endpoint
 * file") and ride as PRESET ARGS — data on the doc, one interned fn per
 * strategy. Endpoints declare `usage.estimate: apifyEstimate.<label>()`
 * per the v1 label survey.
 */

/** Field names that directly cap total results (probed in order). */
export const EXACT_LIMIT_FIELDS = [
    "maxItems",
    "max_results",
    "maxResults",
    "resultsLimit",
    "searchLimit",
    "maxArticles",
    "maxReviews",
    "maxFollowers",
    "maxFollowings",
    "maxComments",
    "maxPosts",
    "max_posts",
    "maxOutput",
];

/** Field names representing a page count. */
export const PAGE_COUNT_FIELDS = [
    "max_pages",
    "maxPages",
    "pages",
    "pageCount",
    "takePages",
];

/** Field names representing per-page result size (paired with page count). */
export const PAGE_SIZE_FIELDS = [
    "num",
    "pageSize",
    "perPage",
    "limit",
];

/** Input keys that act as multipliers (one query each). */
export const MULTIPLIER_FIELDS = [
    "searchTerms",
    "startUrls",
    "twitterHandles",
    "conversationIds",
    "usernames",
    "userIds",
    "urls",
    "directUrls",
    "keywords",
    "hashtags",
    "queries",
    "searchQueries",
    "places",
    "locations",
    "domains",
    "userNames",
    "profileUrls",
    "videoUrls",
    "asins",
    "topics",
    "search",
    "profiles",
    "channels",
    "spotlightUrls",
];

/** v1 DEFAULT_ESTIMATED_RESULTS — the FALLBACK_DEFAULT result count. */
export const DEFAULT_ESTIMATED_RESULTS = 3;

/** The label table (v1 EstimationLabel → estimate preset application). */
export const apifyEstimate = {
    onePerQuery: () => presets.estimate.onePerQuery(MULTIPLIER_FIELDS),
    limitIsExact: () =>
        presets.estimate.limitIsExact(
            EXACT_LIMIT_FIELDS,
            DEFAULT_ESTIMATED_RESULTS,
        ),
    perQueryLimit: () =>
        presets.estimate.perQueryLimit(
            EXACT_LIMIT_FIELDS,
            MULTIPLIER_FIELDS,
            DEFAULT_ESTIMATED_RESULTS,
        ),
    limitIsPages: () =>
        presets.estimate.limitIsPages(
            PAGE_COUNT_FIELDS,
            PAGE_SIZE_FIELDS,
            0, // no declared resultsPerPage — discover a size field, else 10
            DEFAULT_ESTIMATED_RESULTS,
        ),
    perQueryPages: () =>
        presets.estimate.perQueryPages(
            PAGE_COUNT_FIELDS,
            PAGE_SIZE_FIELDS,
            MULTIPLIER_FIELDS,
            0,
            DEFAULT_ESTIMATED_RESULTS,
        ),
    dualLimit: (resultsPerPage = 0) =>
        presets.estimate.dualLimit(
            EXACT_LIMIT_FIELDS,
            PAGE_COUNT_FIELDS,
            PAGE_SIZE_FIELDS,
            resultsPerPage,
            DEFAULT_ESTIMATED_RESULTS,
        ),
} as const;
