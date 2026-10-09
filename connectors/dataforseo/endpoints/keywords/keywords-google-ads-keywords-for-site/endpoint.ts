import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zKeywordsGoogleAdsKeywordsForSiteBody } from "./schema/inputs.ts";

/**
 * Google Ads Site Keywords — `POST
 * /v3/keywords_data/google_ads/keywords_for_site/live` (v1
 * `/keywords/google-ads-keywords-for-site`). Flat: $0.09 per call (design
 * D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Ads Site Keywords",
        summary: "Get Google Ads keyword ideas for a website or page with " +
            "volumes and CPC.",
        description:
            "Google Ads Keyword Planner ideas for a target domain or URL. " +
            "Returns keywords with average and monthly search volume, " +
            "competition, CPC, and top-of-page bids. Supports target_type " +
            "(site or page), location, language, date range, and sorting. " +
            "Suited for building keyword sets from a competitor site. To " +
            "find the location_code or exact location_name for a country " +
            "or city, call dataforseo#keywords/google-ads-locations (free " +
            "lookup of Google Ads locations; country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/keywords_data/google_ads/keywords_for_site/live/",
        categories: ["seo"],
        notes: [
            "One task covers one target. Live Google Ads calls " +
            "are limited to 12 per minute across all Monid users; for " +
            "large batches prefer the Labs keyword endpoints, which carry " +
            "the same volumes without that limit.",
        ],
    },
    endpoint: "/keywords/google-ads-keywords-for-site",
    request: {
        method: "POST",
        path: "/v3/keywords_data/google_ads/keywords_for_site/live",
    },
    input: { schema: { body: zKeywordsGoogleAdsKeywordsForSiteBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.09 },
        },
    },
});
