import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zKeywordsBingSearchVolumeHistoryBody } from "./schema/inputs.ts";

/**
 * Bing Search Volume History — `POST
 * /v3/keywords_data/bing/search_volume_history/live` (v1
 * `/keywords/bing-search-volume-history`). Flat: $0.09 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Bing Search Volume History",
        summary: "Get monthly Bing search volume history for up to 1000 " +
            "keywords.",
        description:
            "Bing Ads search volume history for a keyword list. Returns " +
            "per keyword the monthly search volume series for the " +
            "requested period and device. Supports location, language, " +
            "and period (monthly, weekly, daily). Suited for seasonality " +
            "and trend analysis on Bing. To find the location_code or " +
            "exact location_name for a city or country, call " +
            "dataforseo#keywords/bing-search-volume-history-locations " +
            "(free lookup of Bing locations).",
        docsUrl:
            "https://docs.dataforseo.com/v3/keywords_data/bing/search_volume_history/live/",
        categories: ["seo"],
    },
    endpoint: "/keywords/bing-search-volume-history",
    request: {
        method: "POST",
        path: "/v3/keywords_data/bing/search_volume_history/live",
    },
    input: { schema: { body: zKeywordsBingSearchVolumeHistoryBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.09 },
        },
    },
});
