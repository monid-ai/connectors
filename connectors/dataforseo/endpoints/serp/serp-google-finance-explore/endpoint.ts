import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSerpGoogleFinanceExploreBody } from "./schema/inputs.ts";

/**
 * Google Finance Explore — `POST
 * /v3/serp/google/finance_explore/live/advanced` (v1
 * `/serp/google-finance-explore`). Flat: $0.002 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Finance Explore",
        summary:
            "Fetch Google Finance's explore page: market movers, indexes, " +
            "and news.",
        description:
            "Google Finance explore data for a location. Returns most " +
            "active, gainers, losers, and trending tickers with price and " +
            "change, market index snapshots, and finance news items. " +
            "Supports news_type (top_stories, local_market, " +
            "world_markets). Suited for market overviews and daily movers " +
            "briefings. To find the location_code or exact location_name " +
            "for a city or country, call dataforseo#serp/google-locations " +
            "(free lookup of Google locations).",
        docsUrl:
            "https://docs.dataforseo.com/v3/serp/google/finance_explore/live/advanced/",
        categories: ["equities"],
    },
    endpoint: "/serp/google-finance-explore",
    request: {
        method: "POST",
        path: "/v3/serp/google/finance_explore/live/advanced",
    },
    input: { schema: { body: zSerpGoogleFinanceExploreBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.002 },
        },
    },
});
