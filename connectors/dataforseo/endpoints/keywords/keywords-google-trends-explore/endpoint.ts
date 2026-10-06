import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zKeywordsGoogleTrendsExploreBody } from "./schema/inputs.ts";

/**
 * Google Trends — `POST /v3/keywords_data/google_trends/explore/live` (v1
 * `/keywords/google-trends-explore`). Flat: $0.011 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Trends",
        summary:
            "Get Google Trends interest over time, by region, and related " +
            "queries.",
        description:
            "Google Trends explore data for up to 5 keywords. Returns " +
            "interest-over-time series, interest by region or city, " +
            "related topics, and related queries (top and rising). " +
            "Supports location, language, type (web, news, youtube, " +
            "images, froogle), category_code, date ranges, and item_types " +
            "to pick the blocks. Suited for seasonality, trend " +
            "comparison, and demand spikes. To find the location_code for " +
            "a country or region, call " +
            "dataforseo#keywords/google-trends-locations (free lookup, " +
            "country filter + search). To find a category_code to narrow " +
            "the trend, call dataforseo#keywords/google-trends-categories " +
            "(free lookup of Google Trends categories).",
        docsUrl:
            "https://docs.dataforseo.com/v3/keywords_data/google_trends/explore/live/",
        categories: ["seo"],
    },
    endpoint: "/keywords/google-trends-explore",
    request: {
        method: "POST",
        path: "/v3/keywords_data/google_trends/explore/live",
    },
    input: { schema: { body: zKeywordsGoogleTrendsExploreBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.011 },
        },
    },
});
