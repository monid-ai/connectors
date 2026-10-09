import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zKeywordsGoogleAdsKeywordsForKeywordsBody } from "./schema/inputs.ts";

/**
 * Google Ads Keyword Ideas — `POST
 * /v3/keywords_data/google_ads/keywords_for_keywords/live` (v1
 * `/keywords/google-ads-keywords-for-keywords`). Flat: $0.09 per call
 * (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Ads Keyword Ideas",
        summary:
            "Expand up to 20 seed keywords into Google Ads keyword ideas " +
            "with metrics.",
        description:
            "Google Ads Keyword Planner ideas for up to 20 seed keywords. " +
            "Returns related keywords with average and monthly search " +
            "volume, competition, CPC, and top-of-page bids. Supports " +
            "location, language, search_partners, date range, and " +
            "sorting. Suited for topic expansion and campaign keyword " +
            "mining. To find the location_code or exact location_name for " +
            "a country or city, call " +
            "dataforseo#keywords/google-ads-locations (free lookup of " +
            "Google Ads locations; country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live/",
        categories: ["seo"],
        notes: [
            "One task covers up to 20 seed keywords. Live Google Ads calls " +
            "are limited to 12 per minute across all Monid users; for " +
            "large batches prefer the Labs keyword endpoints, which carry " +
            "the same volumes without that limit.",
        ],
    },
    endpoint: "/keywords/google-ads-keywords-for-keywords",
    request: {
        method: "POST",
        path: "/v3/keywords_data/google_ads/keywords_for_keywords/live",
    },
    input: { schema: { body: zKeywordsGoogleAdsKeywordsForKeywordsBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.09 },
        },
    },
});
