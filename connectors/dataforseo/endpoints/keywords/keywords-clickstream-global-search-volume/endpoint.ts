import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zKeywordsClickstreamGlobalSearchVolumeBody } from "./schema/inputs.ts";

/**
 * Global Search Volume — `POST
 * /v3/keywords_data/clickstream_data/global_search_volume/live` (v1
 * `/keywords/clickstream-global-search-volume`). Flat: $0.18 per call
 * (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Global Search Volume",
        summary: "Get worldwide clickstream search volume for keywords split " +
            "by country.",
        description:
            "DataForSEO clickstream global search volume for a keyword " +
            "list. Returns per keyword the global estimate and a " +
            "per-country breakdown with each country's volume. Suited for " +
            "international demand sizing without querying each market.",
        docsUrl:
            "https://docs.dataforseo.com/v3/keywords_data/clickstream_data/global_search_volume/live/",
        categories: ["seo"],
    },
    endpoint: "/keywords/clickstream-global-search-volume",
    request: {
        method: "POST",
        path: "/v3/keywords_data/clickstream_data/global_search_volume/live",
    },
    input: { schema: { body: zKeywordsClickstreamGlobalSearchVolumeBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.18 },
        },
    },
});
