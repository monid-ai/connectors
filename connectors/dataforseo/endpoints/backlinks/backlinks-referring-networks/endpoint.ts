import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBacklinksReferringNetworksBody } from "./schema/inputs.ts";

/**
 * Referring Networks — `POST /v3/backlinks/referring_networks/live` (v1
 * `/backlinks/referring-networks`). Per-row: $0.024 per request plus
 * $0.000036 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Referring Networks",
        summary: "List IP addresses and subnets sending backlinks to a target.",
        description:
            "Referring IPs or subnets of a target. Returns per network " +
            "the backlink and referring-domain counts and rank. Supports " +
            "network_address_type (ip, subnet), filters, sorting, and up " +
            "to 1000 rows. Suited for detecting link networks. To see " +
            "which fields filters and order_by accept here, call " +
            "dataforseo#backlinks/filters (free lookup of filterable " +
            "fields per Backlinks endpoint).",
        docsUrl:
            "https://docs.dataforseo.com/v3/backlinks/referring_networks/live/",
        categories: ["seo"],
    },
    endpoint: "/backlinks/referring-networks",
    request: { method: "POST", path: "/v3/backlinks/referring_networks/live" },
    input: {
        schema: {
            body: zBacklinksReferringNetworksBody.extend({
                limit: zBacklinksReferringNetworksBody.shape.limit.unwrap()
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
