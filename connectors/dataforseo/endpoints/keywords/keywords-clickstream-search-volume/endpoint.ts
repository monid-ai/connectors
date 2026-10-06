import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zKeywordsClickstreamSearchVolumeBody } from "./schema/inputs.ts";

/**
 * Clickstream Search Volume — `POST
 * /v3/keywords_data/clickstream_data/dataforseo_search_volume/live` (v1
 * `/keywords/clickstream-search-volume`). Flat: $0.18 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Clickstream Search Volume",
        summary: "Get clickstream-based search volume for up to 1000 keywords.",
        description:
            "DataForSEO clickstream search volume for a keyword list, " +
            "location, and language. Returns per keyword the estimated " +
            "search volume and 12 monthly values derived from clickstream " +
            "panels rather than Google Ads. Suited for cross-checking " +
            "Google Ads volumes and for keywords Google groups or hides. " +
            "To find the location_code or exact location_name for a city " +
            "or country, call dataforseo#keywords/clickstream-locations " +
            "(free lookup of clickstream locations).",
        docsUrl:
            "https://docs.dataforseo.com/v3/keywords_data/clickstream_data/dataforseo_search_volume/live/",
        categories: ["seo"],
    },
    endpoint: "/keywords/clickstream-search-volume",
    request: {
        method: "POST",
        path:
            "/v3/keywords_data/clickstream_data/dataforseo_search_volume/live",
    },
    input: { schema: { body: zKeywordsClickstreamSearchVolumeBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.18 },
        },
    },
});
