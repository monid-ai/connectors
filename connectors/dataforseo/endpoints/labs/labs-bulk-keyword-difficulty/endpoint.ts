import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsBulkKeywordDifficultyBody } from "./schema/inputs.ts";

/**
 * Bulk Keyword Difficulty — `POST
 * /v3/dataforseo_labs/google/bulk_keyword_difficulty/live` (v1
 * `/labs/bulk-keyword-difficulty`). Per-row: $0.012 per request plus
 * $0.00012 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Bulk Keyword Difficulty",
        summary: "Get keyword difficulty scores for up to 1000 keywords.",
        description:
            "Keyword difficulty (0-100) for a keyword list in a location " +
            "and language. Returns per keyword the difficulty score. " +
            "Suited for prioritising a keyword set before content " +
            "planning. To find the location_code and language_code pairs " +
            "Labs supports, call dataforseo#labs/locations (free lookup, " +
            "search by country name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/google/bulk_keyword_difficulty/live/",
        categories: ["seo"],
    },
    endpoint: "/labs/bulk-keyword-difficulty",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/google/bulk_keyword_difficulty/live",
    },
    input: { schema: { body: zLabsBulkKeywordDifficultyBody } },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                base_fee: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 0.012 },
                    label: "base fee",
                    description: "the per-request fee",
                },
                rows: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.00012 },
                    label: "rows",
                    description: "items returned (result[0].items, or its " +
                        "items_count when the items were not returned)",
                },
            },
        },
        estimate: ({ data }) => ({
            counts: { rows: data.input.body.keywords.length },
        }),
    },
});
