import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zKeywordsTrendsExploreBody } from "./schema/inputs.ts";

/**
 * Keyword Trend Explore — `POST
 * /v3/keywords_data/dataforseo_trends/explore/live` (v1
 * `/keywords/trends-explore`). Flat: $0.0012 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Keyword Trend Explore",
        summary: "Get keyword search trend series from an independent trends " +
            "dataset.",
        description:
            "DataForSEO Trends explore for up to 5 keywords. Returns " +
            "interest-over-time graphs and a merged comparison across the " +
            "keywords, with the location and time range applied. Supports " +
            "type (web, news, ecommerce), location, and date ranges. " +
            "Suited for trend comparison where Google Trends quotas are a " +
            "constraint. To find the location_code for a country or " +
            "region, call dataforseo#keywords/trends-locations (free " +
            "lookup, country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/keywords_data/dataforseo_trends/explore/live/",
        categories: ["seo"],
    },
    endpoint: "/keywords/trends-explore",
    request: {
        method: "POST",
        path: "/v3/keywords_data/dataforseo_trends/explore/live",
    },
    input: { schema: { body: zKeywordsTrendsExploreBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.0012 },
        },
    },
});
