import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zKeywordsBingKeywordsForKeywordsBody } from "./schema/inputs.ts";

/**
 * Bing Keyword Ideas — `POST
 * /v3/keywords_data/bing/keywords_for_keywords/live` (v1
 * `/keywords/bing-keywords-for-keywords`). Flat: $0.09 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Bing Keyword Ideas",
        summary: "Expand seed keywords into Bing Ads keyword ideas with " +
            "metrics.",
        description:
            "Bing Ads keyword ideas for seed keywords. Returns related " +
            "keywords with average monthly search volume, monthly " +
            "volumes, competition, CPC, and device split. Supports " +
            "location, language, and date range. Suited for Bing topic " +
            "expansion.",
        docsUrl:
            "https://docs.dataforseo.com/v3/keywords_data/bing/keywords_for_keywords/live/",
        categories: ["seo"],
    },
    endpoint: "/keywords/bing-keywords-for-keywords",
    request: {
        method: "POST",
        path: "/v3/keywords_data/bing/keywords_for_keywords/live",
    },
    input: { schema: { body: zKeywordsBingKeywordsForKeywordsBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.09 },
        },
    },
});
