import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBacklinksBacklinksBody } from "./schema/inputs.ts";

/**
 * Backlink List — `POST /v3/backlinks/backlinks/live` (v1
 * `/backlinks/backlinks`). Per-row: $0.024 per request plus $0.000036 per
 * row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Backlink List",
        summary: "List backlinks pointing to a domain or page with anchor, " +
            "rank, and dates.",
        description:
            "Backlinks of a target with per link the source page URL and " +
            "title, anchor text, link attributes (dofollow, sponsored, " +
            "ugc), page and domain rank, spam score, first and last seen " +
            "dates, and whether it is new, lost, or broken. Supports mode " +
            "(as_is, one_per_domain, one_per_anchor), include_subdomains, " +
            "filters, sorting, and up to 1000 rows per page with " +
            "search_after_token paging. Suited for link audits and " +
            "outreach prospecting. To see which fields filters and " +
            "order_by accept here, call dataforseo#backlinks/filters " +
            "(free lookup of filterable fields per Backlinks endpoint).",
        docsUrl: "https://docs.dataforseo.com/v3/backlinks/backlinks/live/",
        categories: ["seo"],
    },
    endpoint: "/backlinks/backlinks",
    request: { method: "POST", path: "/v3/backlinks/backlinks/live" },
    input: {
        schema: {
            body: zBacklinksBacklinksBody.extend({
                limit: zBacklinksBacklinksBody.shape.limit.unwrap().default(
                    100,
                ),
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
