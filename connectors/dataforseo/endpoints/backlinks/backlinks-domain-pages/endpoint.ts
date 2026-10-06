import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBacklinksDomainPagesBody } from "./schema/inputs.ts";

/**
 * Most Linked Pages — `POST /v3/backlinks/domain_pages/live` (v1
 * `/backlinks/domain-pages`). Per-row: $0.024 per request plus $0.000036 per
 * row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Most Linked Pages",
        summary: "List a domain's pages ranked by backlinks and referring " +
            "domains.",
        description: "Pages of a target domain with their backlink metrics. " +
            "Returns per page the URL, backlinks, referring domains, " +
            "rank, spam score, and page title. Supports filters, sorting, " +
            "and up to 1000 rows. Suited for finding a competitor's " +
            "most-linked content. To see which fields filters and " +
            "order_by accept here, call dataforseo#backlinks/filters " +
            "(free lookup of filterable fields per Backlinks endpoint).",
        docsUrl: "https://docs.dataforseo.com/v3/backlinks/domain_pages/live/",
        categories: ["seo"],
    },
    endpoint: "/backlinks/domain-pages",
    request: { method: "POST", path: "/v3/backlinks/domain_pages/live" },
    input: {
        schema: {
            body: zBacklinksDomainPagesBody.extend({
                limit: zBacklinksDomainPagesBody.shape.limit.unwrap().default(
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
