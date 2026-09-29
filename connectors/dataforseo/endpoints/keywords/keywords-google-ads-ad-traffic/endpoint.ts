import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zKeywordsGoogleAdsAdTrafficBody } from "./schema/inputs.ts";

/**
 * Google Ads Traffic Forecast — `POST
 * /v3/keywords_data/google_ads/ad_traffic_by_keywords/live` (v1
 * `/keywords/google-ads-ad-traffic`). Flat: $0.09 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Ads Traffic Forecast",
        summary: "Forecast impressions, clicks, and cost for keywords at a " +
            "bid.",
        description:
            "Google Ads traffic forecast for up to 1000 keywords at a " +
            "maximum bid and match type over a date range. Returns per " +
            "keyword the expected impressions, clicks, CTR, average CPC, " +
            "and cost. Supports location, language, date_interval, and " +
            "sort_by. Suited for PPC budgeting and bid strategy. To find " +
            "the location_code or exact location_name for a country or " +
            "city, call dataforseo#keywords/google-ads-locations (free " +
            "lookup of Google Ads locations; country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/keywords_data/google_ads/ad_traffic_by_keywords/live/",
        categories: ["seo"],
        notes: [
            "One task covers up to 1000 keywords. Live Google Ads calls " +
            "are limited to 12 per minute across all Monid users; for " +
            "large batches prefer the Labs keyword endpoints, which carry " +
            "the same volumes without that limit.",
        ],
    },
    endpoint: "/keywords/google-ads-ad-traffic",
    request: {
        method: "POST",
        path: "/v3/keywords_data/google_ads/ad_traffic_by_keywords/live",
    },
    input: { schema: { body: zKeywordsGoogleAdsAdTrafficBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.09 },
        },
    },
});
