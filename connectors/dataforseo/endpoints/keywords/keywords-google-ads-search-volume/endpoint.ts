import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zKeywordsGoogleAdsSearchVolumeBody } from "./schema/inputs.ts";

/**
 * Google Ads Search Volume — `POST
 * /v3/keywords_data/google_ads/search_volume/live` (v1
 * `/keywords/google-ads-search-volume`). Flat: $0.09 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Ads Search Volume",
        summary:
            "Get Google Ads search volume, CPC, and competition for up to " +
            "1000 keywords.",
        description: "Google Ads Keyword Planner metrics for a keyword list, " +
            "location, and language. Returns per keyword the average " +
            "monthly search volume, 12-month monthly volumes, competition " +
            "and competition index, CPC, and low/high top-of-page bids. " +
            "Supports search_partners, date ranges up to four years back, " +
            "and sort_by. Suited for keyword research, demand sizing, and " +
            "PPC planning. To find the location_code or exact " +
            "location_name for a country or city, call " +
            "dataforseo#keywords/google-ads-locations (free lookup of " +
            "Google Ads locations; country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/",
        categories: ["seo"],
        notes: [
            "One task covers up to 1000 keywords. Live Google Ads calls " +
            "are limited to 12 per minute across all Monid users; for " +
            "large batches prefer the Labs keyword endpoints, which carry " +
            "the same volumes without that limit.",
        ],
    },
    endpoint: "/keywords/google-ads-search-volume",
    request: {
        method: "POST",
        path: "/v3/keywords_data/google_ads/search_volume/live",
    },
    input: { schema: { body: zKeywordsGoogleAdsSearchVolumeBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.09 },
        },
    },
});
