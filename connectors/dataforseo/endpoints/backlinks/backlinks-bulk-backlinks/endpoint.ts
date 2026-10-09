import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBacklinksBulkBacklinksBody } from "./schema/inputs.ts";

/**
 * Bulk Backlink Counts — `POST /v3/backlinks/bulk_backlinks/live` (v1
 * `/backlinks/bulk-backlinks`). Per-row: $0.024 per request plus $0.000036
 * per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Bulk Backlink Counts",
        summary: "Get backlink counts for up to 1000 domains or pages.",
        description:
            "Total backlink count for a list of domains, subdomains, or " +
            "pages. Returns per target its backlinks. Suited for quick " +
            "link-volume comparisons.",
        docsUrl:
            "https://docs.dataforseo.com/v3/backlinks/bulk_backlinks/live/",
        categories: ["seo"],
    },
    endpoint: "/backlinks/bulk-backlinks",
    request: { method: "POST", path: "/v3/backlinks/bulk_backlinks/live" },
    input: { schema: { body: zBacklinksBulkBacklinksBody } },
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
