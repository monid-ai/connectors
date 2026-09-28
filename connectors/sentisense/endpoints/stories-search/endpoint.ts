import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zStoriesSearchQueryParams } from "./schema/inputs.ts";

/** `GET /v1/documents/stories/search`: search market news stories. */
export default defineEndpoint({
    meta: {
        displayName: "SentiSense News Story Search",
        summary:
            "Search recent market news stories by topic, clustered and sentiment-scored.",
        description: "Search the last few weeks of market news by topic. " +
            "Each result is a story, a cluster of articles about the same " +
            "event, with an AI-written title, the number of articles it " +
            "groups, average sentiment from -1 to 1, an impact score from 0 " +
            "to 10, when it broke, whether it is still developing, and the " +
            "tickers and entities it names, newest first. Use it for themes that cut " +
            "across stocks (a Fed decision, a tariff, an AI chip export " +
            "rule); for one stock's own coverage call " +
            "sentisense#v1/documents/stories/ticker/{ticker}.",
        docsUrl: "https://sentisense.ai/docs/api/documents",
        categories: ["news-search", "stock-sentiment"],
    },
    request: { method: "GET", path: "/v1/documents/stories/search" },
    input: { schema: { queryParams: zStoriesSearchQueryParams } },
    /** Analytics class: 2 SentiSense credits per successful call. */
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 2 },
        },
    },
});
