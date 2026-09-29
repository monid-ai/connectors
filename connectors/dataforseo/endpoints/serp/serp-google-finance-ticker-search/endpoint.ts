import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSerpGoogleFinanceTickerSearchBody } from "./schema/inputs.ts";

/**
 * Google Finance Ticker Search — `POST
 * /v3/serp/google/finance_ticker_search/live/advanced` (v1
 * `/serp/google-finance-ticker-search`). Flat: $0.002 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Finance Ticker Search",
        summary: "Resolve a company or instrument name to Google Finance " +
            "tickers.",
        description:
            "Google Finance search for a company or instrument name. " +
            "Returns matching tickers with symbol, exchange, instrument " +
            "type, current price, and change. Use the returned " +
            "'TICKER:EXCHANGE' with google-finance-quote. Suited for " +
            "symbol resolution before quote lookups. To find the " +
            "location_code or exact location_name for a city or country, " +
            "call dataforseo#serp/google-locations (free lookup of Google " +
            "locations).",
        docsUrl:
            "https://docs.dataforseo.com/v3/serp/google/finance_ticker_search/live/advanced/",
        categories: ["equities"],
    },
    endpoint: "/serp/google-finance-ticker-search",
    request: {
        method: "POST",
        path: "/v3/serp/google/finance_ticker_search/live/advanced",
    },
    input: { schema: { body: zSerpGoogleFinanceTickerSearchBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.002 },
        },
    },
});
