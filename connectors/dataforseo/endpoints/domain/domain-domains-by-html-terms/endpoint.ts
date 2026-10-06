import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zDomainDomainsByHtmlTermsBody } from "./schema/inputs.ts";

/**
 * Domains by HTML Terms — `POST
 * /v3/domain_analytics/technologies/domains_by_html_terms/live` (v1
 * `/domain/domains-by-html-terms`). Per-row: $0.012 per request plus $0.0012
 * per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Domains by HTML Terms",
        summary: "List domains whose HTML contains given terms.",
        description:
            "Domains whose page source contains the search_terms (up to " +
            "10, e.g. a tracking id or script name). Returns per domain " +
            "the rank, title, description, country, language, and " +
            "detected technologies. Supports filters, sorting, and up to " +
            "10000 rows. Suited for finding sites on a specific tag or " +
            "vendor snippet. To see which fields filters and order_by " +
            "accept here, call dataforseo#domain/technology-filters (free " +
            "lookup of filterable fields).",
        docsUrl:
            "https://docs.dataforseo.com/v3/domain_analytics/technologies/domains_by_html_terms/live/",
        categories: ["company-enrichment"],
    },
    endpoint: "/domain/domains-by-html-terms",
    request: {
        method: "POST",
        path: "/v3/domain_analytics/technologies/domains_by_html_terms/live",
    },
    input: {
        schema: {
            body: zDomainDomainsByHtmlTermsBody.extend({
                limit: zDomainDomainsByHtmlTermsBody.shape.limit.unwrap()
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
