import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSerpGoogleFinanceQuoteBody } from "./schema/inputs.ts";

/**
 * Google Finance Quote — `POST /v3/serp/google/finance_quote/live/advanced`
 * (v1 `/serp/google-finance-quote`). Flat: $0.002 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Finance Quote",
        summary: "Fetch a Google Finance quote page for a stock, index, or " +
            "currency pair.",
        description:
            "Google Finance quote for a ticker such as 'AAPL:NASDAQ' or " +
            "'EUR-USD'. Returns price, change, previous close, day and " +
            "year range, market cap, volume, P/E, dividend yield, price " +
            "chart points for a window, related news, and comparable " +
            "instruments. Suited for quick fundamentals and price " +
            "lookups. To find the location_code or exact location_name " +
            "for a city or country, call dataforseo#serp/google-locations " +
            "(free lookup of Google locations).",
        docsUrl:
            "https://docs.dataforseo.com/v3/serp/google/finance_quote/live/advanced/",
        categories: ["equities"],
    },
    endpoint: "/serp/google-finance-quote",
    request: {
        method: "POST",
        path: "/v3/serp/google/finance_quote/live/advanced",
    },
    input: { schema: { body: zSerpGoogleFinanceQuoteBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.002 },
        },
    },
});
