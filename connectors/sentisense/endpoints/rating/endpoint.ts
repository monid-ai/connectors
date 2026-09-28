import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTickerPathParams } from "../../schema/common.ts";

/** `GET /v1/rating/{ticker}`: the daily A to F SentiSense Rating. */
export default defineEndpoint({
    meta: {
        displayName: "SentiSense Rating",
        summary:
            "Daily A to F letter grade for a US stock, with the dimensions behind it.",
        description: "The SentiSense Rating for one US stock: a daily 0 to " +
            "100 score and A to F letter, its percentile across every rated " +
            "stock, and the seven dimensions it is built from (crowd " +
            "sentiment, smart money, options positioning, analysts, " +
            "fundamentals, earnings, technicals), each with its own " +
            "percentile and raw value, plus the risk conditions that " +
            "deducted points and the flags that are active. Recomputed " +
            "once per trading day, before the open, from the prior " +
            "session; `asOf` is the run date. A stock the model cannot grade today still " +
            "answers 200 with `rated: false` and a `reason` " +
            "(`not_rated_today`, `insufficient_dimensions`, " +
            "`insufficient_coverage_weight`); the score and letter are " +
            "then absent rather than null. The Rating is in public Beta " +
            "and says so in `betaNotice`. It grades the stock's current " +
            "standing and is not a buy or sell signal.",
        docsUrl: "https://sentisense.ai/docs/api/sentisense-rating",
        categories: ["stock-market-data"],
    },
    request: { method: "GET", path: "/v1/rating/{ticker}" },
    input: { schema: { pathParams: zTickerPathParams } },
    /** Analytics class: 2 SentiSense credits per successful call. */
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 2 },
        },
    },
});
