import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zContentCategoryTrendsBody } from "./schema/inputs.ts";

/**
 * Category Mention Trends — `POST /v3/content_analysis/category_trends/live`
 * (v1 `/content/category-trends`). Per-row: $0.024 per request plus
 * $0.000036 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Category Mention Trends",
        summary: "Get citation volume over time for a content category.",
        description:
            "Citation counts of a content category (by category_code) " +
            "over a date range. Returns per period the number of pages " +
            "and the sentiment split. Supports date_from, date_to, " +
            "date_group, page_type, and initial_dataset_filters. Suited " +
            "for tracking interest in a topic area. To see which fields " +
            "initial_dataset_filters accepts here, call " +
            "dataforseo#content/filters (free lookup of filterable " +
            "fields). To find category codes for content analysis, call " +
            "dataforseo#content/categories (free lookup, search by name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/content_analysis/category_trends/live/",
        categories: ["news-search"],
    },
    endpoint: "/content/category-trends",
    request: {
        method: "POST",
        path: "/v3/content_analysis/category_trends/live",
    },
    input: { schema: { body: zContentCategoryTrendsBody } },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                base_fee: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 0.024 },
                    label: "base fee",
                    description: "the per-request fee",
                },
                rows: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.000036 },
                    label: "rows",
                    description: "items returned (result[0].items, or its " +
                        "items_count when the items were not returned)",
                },
            },
        },
        estimate: () => ({ counts: { rows: 1 } }),
    },
});
