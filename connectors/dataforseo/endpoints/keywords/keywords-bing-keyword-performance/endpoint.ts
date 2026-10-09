import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zKeywordsBingKeywordPerformanceBody } from "./schema/inputs.ts";

/**
 * Bing Keyword Performance — `POST
 * /v3/keywords_data/bing/keyword_performance/live` (v1
 * `/keywords/bing-keyword-performance`). Flat: $0.09 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Bing Keyword Performance",
        summary: "Get Bing Ads impressions, clicks, and CTR by position for " +
            "keywords.",
        description: "Bing Ads keyword performance for up to 1000 keywords. " +
            "Returns per keyword the estimated impressions, clicks, CTR, " +
            "average CPC, and total cost by ad position and device. " +
            "Supports location, language, and match type. Suited for " +
            "Microsoft Ads forecasting. To find the location_code or " +
            "exact location_name for a city or country, call " +
            "dataforseo#keywords/bing-keyword-performance-locations (free " +
            "lookup of Bing locations).",
        docsUrl:
            "https://docs.dataforseo.com/v3/keywords_data/bing/keyword_performance/live/",
        categories: ["seo"],
    },
    endpoint: "/keywords/bing-keyword-performance",
    request: {
        method: "POST",
        path: "/v3/keywords_data/bing/keyword_performance/live",
    },
    input: { schema: { body: zKeywordsBingKeywordPerformanceBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.09 },
        },
    },
});
