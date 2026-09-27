import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBacklinksReferringDomainsBody } from "./schema/inputs.ts";

/**
 * Referring Domains — `POST /v3/backlinks/referring_domains/live` (v1
 * `/backlinks/referring-domains`). Per-row: $0.024 per request plus
 * $0.000036 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Referring Domains",
        summary: "List domains linking to a target with backlink counts and " +
            "rank.",
        description: "Referring domains of a target. Returns per domain the " +
            "backlink count, rank, spam score, first seen date, dofollow " +
            "share, and referring pages. Supports filters, sorting, and " +
            "up to 1000 rows. Suited for link-source quality reviews. To " +
            "see which fields filters and order_by accept here, call " +
            "dataforseo#backlinks/filters (free lookup of filterable " +
            "fields per Backlinks endpoint).",
        docsUrl:
            "https://docs.dataforseo.com/v3/backlinks/referring_domains/live/",
        categories: ["seo"],
    },
    endpoint: "/backlinks/referring-domains",
    request: { method: "POST", path: "/v3/backlinks/referring_domains/live" },
    input: {
        schema: {
            body: zBacklinksReferringDomainsBody.extend({
                limit: zBacklinksReferringDomainsBody.shape.limit.unwrap()
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
