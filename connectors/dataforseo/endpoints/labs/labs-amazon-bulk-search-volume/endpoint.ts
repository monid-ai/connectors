import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsAmazonBulkSearchVolumeBody } from "./schema/inputs.ts";

/**
 * Amazon Search Volume — `POST
 * /v3/dataforseo_labs/amazon/bulk_search_volume/live` (v1
 * `/labs/amazon-bulk-search-volume`). Per-row: $0.012 per request plus
 * $0.00012 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Amazon Search Volume",
        summary: "Get Amazon search volume for up to 1000 keywords.",
        description:
            "Amazon search volume for a keyword list in a marketplace " +
            "location. Returns per keyword the estimated monthly Amazon " +
            "searches. Suited for product keyword research and listing " +
            "optimisation. To find the location_code and language_code " +
            "pairs Labs supports, call dataforseo#labs/locations (free " +
            "lookup, search by country name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/amazon/bulk_search_volume/live/",
        categories: ["amazon"],
    },
    endpoint: "/labs/amazon-bulk-search-volume",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/amazon/bulk_search_volume/live",
    },
    input: { schema: { body: zLabsAmazonBulkSearchVolumeBody } },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                base_fee: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 0.012 },
                    label: "base fee",
                    description: "the per-request fee",
                },
                rows: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.00012 },
                    label: "rows",
                    description: "items returned (result[0].items, or its " +
                        "items_count when the items were not returned)",
                },
            },
        },
        estimate: ({ data }) => ({
            counts: { rows: data.input.body.keywords.length },
        }),
    },
});
