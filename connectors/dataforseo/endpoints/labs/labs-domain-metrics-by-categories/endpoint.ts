import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsDomainMetricsByCategoriesBody } from "./schema/inputs.ts";

/**
 * Domain Metrics by Category — `POST
 * /v3/dataforseo_labs/google/domain_metrics_by_categories/live` (v1
 * `/labs/domain-metrics-by-categories`). Per-row: $0.12 per request plus
 * $0.0012 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Domain Metrics by Category",
        summary: "Compare domain rank metrics across product categories " +
            "between two dates.",
        description:
            "Ranking metrics of domains in up to 5 categories, comparing " +
            "first_date to second_date. Returns per domain the ranked " +
            "keywords, traffic, and rank changes in each category. " +
            "Supports filters, sorting, and up to 1000 rows. Suited for " +
            "category-level market share tracking. To see which fields " +
            "filters and order_by accept here, call " +
            "dataforseo#labs/filters (free lookup of filterable fields " +
            "per Labs endpoint). To find the location_code and " +
            "language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name). To find category_codes for a product or service " +
            "category, call dataforseo#labs/categories (free lookup, " +
            "search by name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/google/domain_metrics_by_categories/live/",
        categories: ["seo"],
    },
    endpoint: "/labs/domain-metrics-by-categories",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/google/domain_metrics_by_categories/live",
    },
    input: {
        schema: {
            body: zLabsDomainMetricsByCategoriesBody.extend({
                limit: zLabsDomainMetricsByCategoriesBody.shape.limit.unwrap()
                    .default(100),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                base_fee: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 0.12 },
                    label: "base fee",
                    description: "the per-request fee",
                },
                rows: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.0012 },
                    label: "rows",
                    description: "items returned (result[0].items, or its " +
                        "items_count when the items were not returned)",
                },
            },
        },
        estimate: ({ data }) => ({ counts: { rows: data.input.body.limit } }),
    },
});
