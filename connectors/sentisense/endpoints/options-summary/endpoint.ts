import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTickerPathParams } from "../../schema/common.ts";

/** `GET /v1/stocks/{ticker}/options/summary`: end-of-day options dossier. */
export default defineEndpoint({
    meta: {
        displayName: "SentiSense Options Summary",
        summary:
            "End-of-day options positioning for a US stock or ETF: IV rank, skew, put/call, max pain.",
        description: "End-of-day options positioning for one US stock or " +
            "ETF: an options sentiment score, call and put volume and " +
            "open interest, put/call ratios, at-the-money and 25-delta " +
            "implied volatility with the skew, 60 and 90 day IV, the " +
            "expected move, each measured against the ticker's own trailing " +
            "year as a percentile (IV rank, put/call percentile), the " +
            "largest open-interest walls and max pain for the front " +
            "expiry, and the top unusual contracts by volume against open " +
            "interest. Built once per trading day after the close, so it " +
            "describes the last session, not live flow. Stocks and ETFs " +
            "are both accepted.",
        docsUrl: "https://sentisense.ai/docs/api/options",
        categories: ["stock-market-data"],
        notes: [
            "The payload arrives under `data` in the `{isPreview, " +
            "previewReason, data}` envelope. `data` is null for a ticker " +
            "with no options snapshot; that is a 200, not an error.",
            "Percentile fields are omitted when the ticker has too few " +
            "observations to rank against.",
        ],
    },
    request: { method: "GET", path: "/v1/stocks/{ticker}/options/summary" },
    input: { schema: { pathParams: zTickerPathParams } },
    /** Alternative-data class: 4 SentiSense credits per successful call. */
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 4 },
        },
    },
});
