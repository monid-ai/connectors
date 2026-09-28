import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTickerPathParams } from "../../schema/common.ts";
import { zInsiderTradesQueryParams } from "./schema/inputs.ts";

/** `GET /v1/insider/trades/{ticker}`: SEC Form 4 trades for one stock. */
export default defineEndpoint({
    meta: {
        displayName: "SentiSense Insider Trades",
        summary: "SEC Form 4 insider buys and sells for a US stock.",
        description: "Insider transactions in one US stock from SEC Form 4 " +
            "filings, newest first: who traded (name, title, and whether " +
            "they are an officer, director or 10% owner), the transaction " +
            "and filing dates, the raw SEC transaction code with a " +
            "simplified `transactionType` (BUY, SELL, EXERCISE, AWARD, " +
            "GIFT, OTHER), shares, price per share, total value, shares owned " +
            "afterwards, direct or indirect ownership, and whether the " +
            "trade ran under a Rule 10b5-1 plan. In the returned trades, " +
            "rows with `transactionCode` P are open-market buys, the " +
            "signal most worth reading; awards and exercises are compensation, not " +
            "conviction. For buys by three or more insiders across the " +
            "whole market call sentisense#v1/insider/cluster-buys.",
        docsUrl: "https://sentisense.ai/docs/api/insider-trading",
        categories: ["ownership-filings"],
        notes: [
            "The trades arrive under `data` in the `{isPreview, " +
            "previewReason, data}` envelope.",
            "`pricePerShare` is null on awards and on trades reported in " +
            "a foreign ordinary share basis.",
            "`transactionType` SELL includes code F (shares withheld for " +
            "tax), which is not a market sale. Read `transactionCode` when " +
            "the difference matters.",
        ],
    },
    request: { method: "GET", path: "/v1/insider/trades/{ticker}" },
    input: {
        schema: {
            pathParams: zTickerPathParams,
            queryParams: zInsiderTradesQueryParams,
        },
    },
    /** Analytics class: 2 SentiSense credits per successful call. */
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 2 },
        },
    },
});
