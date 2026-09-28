import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTweetRepliesQueryParams } from "./schema/inputs.ts";

/** GET /tweet/replies: Get X (Twitter) Post Replies. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Post Replies",
        summary: "Replies to one tweet, about 20 per page.",
        description:
            "Page through the replies to a tweet, about 20 per call, each " +
            "with its author profile and engagement counts. `reply_count` " +
            "is the number returned on this page. For the original author's " +
            "own continuation, use `getxapi#tweet/thread`; to search " +
            "replies across many tweets, use " +
            "`getxapi#tweet/advanced_search` with `conversation_id:<id>` in " +
            "`q`.",
        docsUrl: "https://docs.getxapi.com/docs/tweets/tweet-replies",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/tweet/replies" },
    input: { schema: { queryParams: zTweetRepliesQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "replies page",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
