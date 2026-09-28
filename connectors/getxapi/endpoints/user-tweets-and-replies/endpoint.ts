import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUserTweetsAndRepliesQueryParams } from "./schema/inputs.ts";

/** GET /user/tweets_and_replies: Get X (Twitter) User Posts and Replies. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) User Posts and Replies",
        summary: "An account's tweets and replies, newest first.",
        description:
            "Page through everything an account posts, its tweets and its " +
            "replies to others, newest first, about 20 per call. For tweets " +
            "only, use `getxapi#user/tweets`; to expand the account's " +
            "self-threads inline, `getxapi#user/tweets/complete`.",
        docsUrl: "https://docs.getxapi.com/docs/users/user-tweets-and-replies",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/user/tweets_and_replies" },
    input: { schema: { queryParams: zUserTweetsAndRepliesQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "timeline page",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
