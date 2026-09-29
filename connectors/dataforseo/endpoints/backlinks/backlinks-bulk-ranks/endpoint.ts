import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBacklinksBulkRanksBody } from "./schema/inputs.ts";

/**
 * Bulk Domain Ranks — `POST /v3/backlinks/bulk_ranks/live` (v1
 * `/backlinks/bulk-ranks`). Per-row: $0.024 per request plus $0.000036 per
 * row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Bulk Domain Ranks",
        summary: "Get backlink rank for up to 1000 domains or pages.",
        description: "Rank (0-1000, PageRank-like) for a list of domains, " +
            "subdomains, or pages. Returns per target its rank. Suited " +
            "for scoring a list of sites at once.",
        docsUrl: "https://docs.dataforseo.com/v3/backlinks/bulk_ranks/live/",
        categories: ["seo"],
    },
    endpoint: "/backlinks/bulk-ranks",
    request: { method: "POST", path: "/v3/backlinks/bulk_ranks/live" },
    input: { schema: { body: zBacklinksBulkRanksBody } },
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
