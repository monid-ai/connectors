import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTickerPathParams } from "../../schema/common.ts";
import { zStoriesByTickerQueryParams } from "./schema/inputs.ts";

/** `GET /v1/documents/stories/ticker/{ticker}`: news stories for a stock. */
export default defineEndpoint({
    meta: {
        displayName: "SentiSense Stock News Stories",
        summary:
            "Recent news stories about a US stock, clustered and sentiment-scored.",
        description: "The latest news stories about one US stock. A story " +
            "is a cluster of articles about the same event, so a single " +
            "result stands in for every outlet that covered it: an " +
            "AI-written story title, how many articles it groups, the " +
            "average sentiment from -1 to 1, an impact score from 0 to 10, " +
            "when it broke, whether it is still developing, and every " +
            "ticker and entity it names. Returns story summaries, not " +
            "article text or links. A ticker we do not track returns an " +
            "empty list. To search stories by topic instead of ticker call " +
            "sentisense#v1/documents/stories/search.",
        docsUrl: "https://sentisense.ai/docs/api/documents",
        categories: ["news-search", "stock-sentiment"],
    },
    request: {
        method: "GET",
        path: "/v1/documents/stories/ticker/{ticker}",
    },
    input: {
        schema: {
            pathParams: zTickerPathParams,
            queryParams: zStoriesByTickerQueryParams,
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
