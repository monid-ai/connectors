import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zDomainTechnologiesSummaryBody } from "./schema/inputs.ts";

/**
 * Technology Usage Summary — `POST
 * /v3/domain_analytics/technologies/technologies_summary/live` (v1
 * `/domain/technologies-summary`). Per-row: $0.012 per request plus $0.0012
 * per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Technology Usage Summary",
        summary: "Count domains using technologies, split by country and " +
            "language.",
        description:
            "Usage summary for the requested technologies, categories, or " +
            "groups. Returns the number of domains using them and the " +
            "breakdown by country and language. Supports keywords " +
            "narrowing. Suited for market-share sizing of a technology. " +
            "To find technology, category, and group names to query by, " +
            "call dataforseo#domain/technology-catalog (free lookup of " +
            "the technology tree). To see which fields filters accepts " +
            "here, call dataforseo#domain/technology-filters (free lookup " +
            "of filterable fields).",
        docsUrl:
            "https://docs.dataforseo.com/v3/domain_analytics/technologies/technologies_summary/live/",
        categories: ["company-enrichment"],
    },
    endpoint: "/domain/technologies-summary",
    request: {
        method: "POST",
        path: "/v3/domain_analytics/technologies/technologies_summary/live",
    },
    input: {
        schema: {
            body: z.union([
                zDomainTechnologiesSummaryBody.required({
                    technology_paths: true,
                }),
                zDomainTechnologiesSummaryBody.required({ groups: true }),
                zDomainTechnologiesSummaryBody.required({ categories: true }),
                zDomainTechnologiesSummaryBody.required({ technologies: true }),
                zDomainTechnologiesSummaryBody.required({ keywords: true }),
            ]).describe(
                "Provide at least one of technology_paths, groups, categories, technologies, or keywords.",
            ),
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
        estimate: () => ({ counts: { rows: 1 } }),
    },
});
