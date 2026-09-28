import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTickerPathParams } from "../../schema/common.ts";

/** `GET /v1/stocks/{ticker}/sentiment`: the headline sentiment picture. */
export default defineEndpoint({
    meta: {
        displayName: "SentiSense Stock Sentiment",
        summary:
            "News and social sentiment for a US stock, with the SentiSense Score.",
        description: "The sentiment picture for one US stock in a single " +
            "call: today's SentiSense Score (a sentiment times mention " +
            "volume composite), its 30-day average and change, a " +
            "seven-band label from Strong Bearish to Strong Bullish, the " +
            "trend, a daily Score sparkline, mention volume against its " +
            "30-day average, share of voice, tone and mention share per " +
            "source (news, X, Reddit, YouTube, Substack and more), the " +
            "stories driving the tone, peer tickers, and a short narrative " +
            "of why the Score sits where it does. The Score describes the " +
            "conversation, not the price move. For the market as a whole " +
            "call sentisense#v2/market-mood.",
        docsUrl: "https://sentisense.ai/docs/api/stocks",
        categories: ["stock-sentiment"],
        notes: [
            "The payload arrives under `data` in the `{isPreview, " +
            "previewReason, data}` envelope.",
            "`sentisenseScore` is null until the day's reading lands; " +
            "`sentisenseScoreAvg30d` is always present and is the stable " +
            "figure to compare stocks on.",
        ],
    },
    request: { method: "GET", path: "/v1/stocks/{ticker}/sentiment" },
    input: { schema: { pathParams: zTickerPathParams } },
    /** Analytics class: 2 SentiSense credits per successful call. */
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 2 },
        },
    },
});
