import { defineEndpoint } from "@shared/core";
import { zMarketMoodQueryParams } from "./schema/inputs.ts";

/** `GET /v2/market-mood`: the fear to greed index for the US market. */
export default defineEndpoint({
    meta: {
        displayName: "SentiSense Market Mood",
        summary:
            "Fear to greed index for the US stock market and each sector, with history.",
        description: "The SentiSense Market Mood index: a 0 to 100 fear to " +
            "greed reading for the US stock market, its phase (from " +
            "Extreme Fear to Extreme Greed), the weekly change, the " +
            "component signals behind it (social sentiment, market " +
            "direction, fear gauge, social momentum, S&P 500 trend, options " +
            "flow), " +
            "a daily history of the score and each component, and the same " +
            "score and phase for each sector. Use it to set the " +
            "backdrop before reading a single stock; for one ticker's own " +
            "tone call sentisense#v1/stocks/{ticker}/sentiment.",
        docsUrl: "https://sentisense.ai/docs/api/market-mood",
        categories: ["stock-sentiment"],
        notes: [
            "Match `signals` by `key`, not by position: the order is not " +
            "part of the contract.",
        ],
    },
    request: { method: "GET", path: "/v2/market-mood" },
    input: { schema: { queryParams: zMarketMoodQueryParams } },
});
