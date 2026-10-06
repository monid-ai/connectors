import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBacklinksDomainPagesSummaryBody } from "./schema/inputs.ts";

/**
 * Page Backlink Summaries — `POST /v3/backlinks/domain_pages_summary/live`
 * (v1 `/backlinks/domain-pages-summary`). Per-row: $0.024 per request plus
 * $0.000036 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Page Backlink Summaries",
        summary: "Get backlink summaries for each page of a domain.",
        description:
            "Per-page backlink summary for a target domain or subdomain: " +
            "each page's backlinks, referring domains, rank, broken " +
            "links, and dofollow share. Supports filters, sorting, and up " +
            "to 1000 rows. Suited for site-wide link distribution " +
            "reviews. To see which fields filters and order_by accept " +
            "here, call dataforseo#backlinks/filters (free lookup of " +
            "filterable fields per Backlinks endpoint).",
        docsUrl:
            "https://docs.dataforseo.com/v3/backlinks/domain_pages_summary/live/",
        categories: ["seo"],
    },
    endpoint: "/backlinks/domain-pages-summary",
    request: {
        method: "POST",
        path: "/v3/backlinks/domain_pages_summary/live",
    },
    input: {
        schema: {
            body: zBacklinksDomainPagesSummaryBody.extend({
                limit: zBacklinksDomainPagesSummaryBody.shape.limit.unwrap()
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
        estimate: ({ data }) => ({ counts: { rows: data.input.body.limit } }),
    },
});
