import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSerpGoogleFinanceMarketsBody } from "./schema/inputs.ts";

/**
 * Google Finance Markets — `POST
 * /v3/serp/google/finance_markets/live/advanced` (v1
 * `/serp/google-finance-markets`). Flat: $0.002 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Finance Markets",
        summary: "Fetch Google Finance market summaries by region or asset " +
            "class.",
        description:
            "Google Finance markets page for a market_type (indexes by " +
            "region, most active, gainers, losers, climate leaders, " +
            "crypto, currencies). Returns instruments with name, ticker, " +
            "price, change, and percent change. Suited for cross-market " +
            "snapshots and watchlist refreshes. To find the location_code " +
            "or exact location_name for a city or country, call " +
            "dataforseo#serp/google-locations (free lookup of Google " +
            "locations).",
        docsUrl:
            "https://docs.dataforseo.com/v3/serp/google/finance_markets/live/advanced/",
        categories: ["equities"],
    },
    endpoint: "/serp/google-finance-markets",
    request: {
        method: "POST",
        path: "/v3/serp/google/finance_markets/live/advanced",
    },
    input: { schema: { body: zSerpGoogleFinanceMarketsBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.002 },
        },
    },
});
