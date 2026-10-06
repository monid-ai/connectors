import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zKeywordsBingSearchVolumeBody } from "./schema/inputs.ts";

/**
 * Bing Search Volume — `POST /v3/keywords_data/bing/search_volume/live` (v1
 * `/keywords/bing-search-volume`). Flat: $0.09 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Bing Search Volume",
        summary: "Get Bing Ads search volume, CPC, and competition for up to " +
            "1000 keywords.",
        description:
            "Bing Ads Keyword Planner metrics for a keyword list. Returns " +
            "per keyword the average monthly search volume, monthly " +
            "volumes, competition, CPC, and device split. Supports " +
            "location, language, date range, and search_partners. Suited " +
            "for Bing keyword research and Microsoft Ads planning.",
        docsUrl:
            "https://docs.dataforseo.com/v3/keywords_data/bing/search_volume/live/",
        categories: ["seo"],
    },
    endpoint: "/keywords/bing-search-volume",
    request: {
        method: "POST",
        path: "/v3/keywords_data/bing/search_volume/live",
    },
    input: { schema: { body: zKeywordsBingSearchVolumeBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.09 },
        },
    },
});
