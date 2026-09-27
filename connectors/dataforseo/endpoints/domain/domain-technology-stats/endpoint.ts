import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zDomainTechnologyStatsBody } from "./schema/inputs.ts";

/**
 * Technology Adoption Stats — `POST
 * /v3/domain_analytics/technologies/technology_stats/live` (v1
 * `/domain/technology-stats`). Per-row: $0.012 per request plus $0.0012 per
 * row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Technology Adoption Stats",
        summary: "Get monthly adoption history of one technology.",
        description:
            "Adoption history of a technology by name. Returns per month " +
            "the number of domains using it and the split by country and " +
            "language. Supports date_from and date_to. Suited for " +
            "technology trend charts. To find technology, category, and " +
            "group names to query by, call " +
            "dataforseo#domain/technology-catalog (free lookup of the " +
            "technology tree).",
        docsUrl:
            "https://docs.dataforseo.com/v3/domain_analytics/technologies/technology_stats/live/",
        categories: ["company-enrichment"],
    },
    endpoint: "/domain/technology-stats",
    request: {
        method: "POST",
        path: "/v3/domain_analytics/technologies/technology_stats/live",
    },
    input: { schema: { body: zDomainTechnologyStatsBody } },
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
        estimate: () => ({ counts: { rows: 1 } }),
    },
});
