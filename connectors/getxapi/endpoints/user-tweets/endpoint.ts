import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zUserTweetsQueryParams } from "./schema/inputs.ts";

/** GET /user/tweets: Get X (Twitter) User Posts. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) User Posts",
        summary: "An account's own tweets, newest first, about 20 per page.",
        description:
            "Page through the tweets an account has posted, newest first, " +
            "about 20 per call, with engagement counts, media, and quoted " +
            "context. Reposts are included. Pass `userName` or `userId`; " +
            "the id is faster and survives a rename. For the account's " +
            "replies to others, use `getxapi#user/tweets_and_replies`; for " +
            "date ranges or keywords, `getxapi#tweet/advanced_search` with " +
            "`from:<username>`.",
        docsUrl: "https://docs.getxapi.com/docs/users/user-tweets",
        categories: ["twitter"],
        notes: [
            "Exactly one of `userName` or `userId`.",
        ],
    },
    request: { method: "GET", path: "/user/tweets" },
    input: { schema: { queryParams: zUserTweetsQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "tweets page",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
