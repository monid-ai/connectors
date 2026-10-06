import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsCategoriesForKeywordsBody } from "./schema/inputs.ts";

/**
 * Categories for Keywords — `POST
 * /v3/dataforseo_labs/google/categories_for_keywords/live` (v1
 * `/labs/categories-for-keywords`). Per-row: $0.012 per request plus
 * $0.00012 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Categories for Keywords",
        summary: "Map up to 1000 keywords to Google product categories.",
        description: "Product category codes for a keyword list. Returns per " +
            "keyword the matching category codes with names. Suited for " +
            "grouping keyword sets by category before deeper research. To " +
            "look up the names behind the returned category codes, call " +
            "dataforseo#labs/categories (free lookup, search by name). To " +
            "find the location_code or exact location_name for a city or " +
            "country, call dataforseo#labs/locations (free lookup of Labs " +
            "locations).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/google/categories_for_keywords/live/",
        categories: ["seo"],
    },
    endpoint: "/labs/categories-for-keywords",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/google/categories_for_keywords/live",
    },
    input: { schema: { body: zLabsCategoriesForKeywordsBody } },
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
