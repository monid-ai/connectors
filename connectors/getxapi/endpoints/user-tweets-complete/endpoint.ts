import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUserTweetsCompleteQueryParams } from "./schema/inputs.ts";

/** GET /user/tweets/complete: Get X (Twitter) User Posts, Threads Expanded. $0.003 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) User Posts, Threads Expanded",
        summary: "Tweets and replies with the author's self-threads expanded " +
            "inline.",
        description:
            "The tweets-and-replies timeline with each self-thread expanded " +
            "in place, so a thread arrives whole instead of as a lone root " +
            "tweet. Reads about 40 raw timeline entries per page and " +
            "reports `expanded_threads` and `complete`. Use it to archive " +
            "or summarize an account's writing; for a plain feed, " +
            "`getxapi#user/tweets_and_replies` is a third of the price.",
        docsUrl: "https://docs.getxapi.com/docs/users/user-tweets-complete",
        categories: ["twitter"],
        notes: [
            "Priced at $0.003 per call because each page also resolves the " +
            "threads it contains.",
        ],
    },
    request: { method: "GET", path: "/user/tweets/complete" },
    input: { schema: { queryParams: zUserTweetsCompleteQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "timeline page",
            consumes: { credit: "default", amount: 0.003 },
        },
    },
});
