import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zDomainTechnologiesAggregationBody } from "./schema/inputs.ts";

/**
 * Technology Co-usage — `POST
 * /v3/domain_analytics/technologies/aggregation_technologies/live` (v1
 * `/domain/technologies-aggregation`). Per-row: $0.012 per request plus
 * $0.0012 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Technology Co-usage",
        summary: "List technologies most used alongside a technology, " +
            "category, or group.",
        description:
            "Technologies aggregated across domains that use the given " +
            "technology, category, group, or keyword. Returns per " +
            "technology the name, category, and domain count. Supports " +
            "internal_list_limit, filters, sorting, and up to 10000 rows. " +
            "Suited for finding what stacks pair with a product. To see " +
            "which fields filters and order_by accept here, call " +
            "dataforseo#domain/technology-filters (free lookup of " +
            "filterable fields). To find technology, category, and group " +
            "names to query by, call dataforseo#domain/technology-catalog " +
            "(free lookup of the technology tree).",
        docsUrl:
            "https://docs.dataforseo.com/v3/domain_analytics/technologies/aggregation_technologies/live/",
        categories: ["company-enrichment"],
    },
    endpoint: "/domain/technologies-aggregation",
    request: {
        method: "POST",
        path: "/v3/domain_analytics/technologies/aggregation_technologies/live",
    },
    input: {
        schema: {
            body: zDomainTechnologiesAggregationBody.extend({
                limit: zDomainTechnologiesAggregationBody.shape.limit.unwrap()
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
                    consumes: { credit: "default", amount: 0.012 },
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
