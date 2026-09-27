import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zDomainDomainsByTechnologyBody } from "./schema/inputs.ts";

/** The mirror with the vendor's default page. */
const zBody = zDomainDomainsByTechnologyBody.extend({
    limit: zDomainDomainsByTechnologyBody.shape.limit.unwrap()
        .default(100),
});

/**
 * Domains by Technology — `POST
 * /v3/domain_analytics/technologies/domains_by_technology/live` (v1
 * `/domain/domains-by-technology`). Per-row: $0.012 per request plus $0.0012
 * per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Domains by Technology",
        summary: "List domains using given technologies, categories, or " +
            "groups.",
        description: "Domains that use the requested technologies (by name, " +
            "category, or group), optionally narrowed by keywords in " +
            "their meta tags, country, and language. Returns per domain " +
            "the rank, title, description, country, language, and matched " +
            "technologies. Supports filters, sorting, and up to 10000 " +
            "rows. Suited for technographic lead lists. To see which " +
            "fields filters and order_by accept here, call " +
            "dataforseo#domain/technology-filters (free lookup of " +
            "filterable fields). To find technology, category, and group " +
            "names to query by, call dataforseo#domain/technology-catalog " +
            "(free lookup of the technology tree).",
        docsUrl:
            "https://docs.dataforseo.com/v3/domain_analytics/technologies/domains_by_technology/live/",
        categories: ["company-enrichment"],
    },
    endpoint: "/domain/domains-by-technology",
    request: {
        method: "POST",
        path: "/v3/domain_analytics/technologies/domains_by_technology/live",
    },
    input: {
        schema: {
            body: z.union([
                zBody.required({ technology_paths: true }),
                zBody.required({ groups: true }),
                zBody.required({ categories: true }),
                zBody.required({ technologies: true }),
                zBody.required({ keywords: true }),
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
        estimate: ({ data }) => ({ counts: { rows: data.input.body.limit } }),
    },
});
