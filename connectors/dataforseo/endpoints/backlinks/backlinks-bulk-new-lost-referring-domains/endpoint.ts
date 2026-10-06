import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBacklinksBulkNewLostReferringDomainsBody } from "./schema/inputs.ts";

/**
 * Bulk New Lost Domains — `POST
 * /v3/backlinks/bulk_new_lost_referring_domains/live` (v1
 * `/backlinks/bulk-new-lost-referring-domains`). Per-row: $0.024 per request
 * plus $0.000036 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Bulk New Lost Domains",
        summary: "Get new and lost referring domains since a date for up to " +
            "1000 targets.",
        description:
            "New and lost referring domain counts since date_from for a " +
            "list of domains, subdomains, or pages. Returns per target " +
            "the new and lost referring domains. Suited for portfolio " +
            "link monitoring.",
        docsUrl:
            "https://docs.dataforseo.com/v3/backlinks/bulk_new_lost_referring_domains/live/",
        categories: ["seo"],
    },
    endpoint: "/backlinks/bulk-new-lost-referring-domains",
    request: {
        method: "POST",
        path: "/v3/backlinks/bulk_new_lost_referring_domains/live",
    },
    input: { schema: { body: zBacklinksBulkNewLostReferringDomainsBody } },
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
