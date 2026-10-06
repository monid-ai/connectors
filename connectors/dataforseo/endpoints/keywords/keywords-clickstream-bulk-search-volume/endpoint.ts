import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zKeywordsClickstreamBulkSearchVolumeBody } from "./schema/inputs.ts";

/**
 * Bulk Clickstream Volume — `POST
 * /v3/keywords_data/clickstream_data/bulk_search_volume/live` (v1
 * `/keywords/clickstream-bulk-search-volume`). Per-row: $0.012 per request
 * plus $0.00012 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Bulk Clickstream Volume",
        summary: "Get clickstream search volume for many keywords at a " +
            "per-keyword price.",
        description:
            "DataForSEO clickstream bulk search volume for a keyword list " +
            "and location. Returns per keyword the search volume and " +
            "monthly series, billed per keyword returned. Suited for " +
            "large keyword sets where the flat-price clickstream call is " +
            "not economical. To find the location_code or exact " +
            "location_name for a city or country, call " +
            "dataforseo#keywords/clickstream-locations (free lookup of " +
            "clickstream locations).",
        docsUrl:
            "https://docs.dataforseo.com/v3/keywords_data/clickstream_data/bulk_search_volume/live/",
        categories: ["seo"],
    },
    endpoint: "/keywords/clickstream-bulk-search-volume",
    request: {
        method: "POST",
        path: "/v3/keywords_data/clickstream_data/bulk_search_volume/live",
    },
    input: { schema: { body: zKeywordsClickstreamBulkSearchVolumeBody } },
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
