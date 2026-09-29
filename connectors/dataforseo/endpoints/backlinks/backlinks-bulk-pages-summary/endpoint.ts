import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBacklinksBulkPagesSummaryBody } from "./schema/inputs.ts";

/**
 * Bulk Page Summaries — `POST /v3/backlinks/bulk_pages_summary/live` (v1
 * `/backlinks/bulk-pages-summary`). Per-row: $0.024 per request plus
 * $0.000036 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Bulk Page Summaries",
        summary: "Get backlink summaries for up to 1000 pages or domains.",
        description: "Backlink summary for a list of pages, subdomains, or " +
            "domains: per target the backlinks, referring domains, rank, " +
            "spam score, and dofollow share. Supports include_subdomains. " +
            "Suited for auditing a URL list in one call.",
        docsUrl:
            "https://docs.dataforseo.com/v3/backlinks/bulk_pages_summary/live/",
        categories: ["seo"],
    },
    endpoint: "/backlinks/bulk-pages-summary",
    request: { method: "POST", path: "/v3/backlinks/bulk_pages_summary/live" },
    input: { schema: { body: zBacklinksBulkPagesSummaryBody } },
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
        estimate: ({ data }) => ({
            counts: { rows: data.input.body.targets.length },
        }),
    },
});
