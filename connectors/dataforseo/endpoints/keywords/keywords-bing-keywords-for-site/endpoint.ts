import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zKeywordsBingKeywordsForSiteBody } from "./schema/inputs.ts";

/**
 * Bing Keywords for Site — `POST
 * /v3/keywords_data/bing/keywords_for_site/live` (v1
 * `/keywords/bing-keywords-for-site`). Flat: $0.09 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Bing Keywords for Site",
        summary: "Get Bing Ads keyword ideas for a website with volumes and " +
            "CPC.",
        description:
            "Bing Ads keyword ideas for a target domain. Returns keywords " +
            "with average monthly search volume, monthly volumes, " +
            "competition, CPC, and device split. Supports location, " +
            "language, and date range. Suited for building Bing keyword " +
            "sets from a site.",
        docsUrl:
            "https://docs.dataforseo.com/v3/keywords_data/bing/keywords_for_site/live/",
        categories: ["seo"],
    },
    endpoint: "/keywords/bing-keywords-for-site",
    request: {
        method: "POST",
        path: "/v3/keywords_data/bing/keywords_for_site/live",
    },
    input: { schema: { body: zKeywordsBingKeywordsForSiteBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.09 },
        },
    },
});
