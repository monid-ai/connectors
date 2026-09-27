import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBacklinksBulkNewLostBacklinksBody } from "./schema/inputs.ts";

/**
 * Bulk New Lost Backlinks — `POST
 * /v3/backlinks/bulk_new_lost_backlinks/live` (v1
 * `/backlinks/bulk-new-lost-backlinks`). Per-row: $0.024 per request plus
 * $0.000036 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Bulk New Lost Backlinks",
        summary: "Get new and lost backlinks since a date for up to 1000 " +
            "targets.",
        description:
            "New and lost backlink counts since date_from for a list of " +
            "domains, subdomains, or pages. Returns per target the new " +
            "and lost backlinks. Suited for portfolio link monitoring.",
        docsUrl:
            "https://docs.dataforseo.com/v3/backlinks/bulk_new_lost_backlinks/live/",
        categories: ["seo"],
    },
    endpoint: "/backlinks/bulk-new-lost-backlinks",
    request: {
        method: "POST",
        path: "/v3/backlinks/bulk_new_lost_backlinks/live",
    },
    input: { schema: { body: zBacklinksBulkNewLostBacklinksBody } },
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
