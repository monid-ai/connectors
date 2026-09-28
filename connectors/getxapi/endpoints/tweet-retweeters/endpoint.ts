import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTweetRetweetersQueryParams } from "./schema/inputs.ts";

/** GET /tweet/retweeters: Get X (Twitter) Post Reposters. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Post Reposters",
        summary: "Accounts that reposted a tweet, with profiles.",
        description:
            "List the accounts that reposted (retweeted) a tweet, as full " +
            "profiles: name, bio, follower and following counts, " +
            "verification, and creation date. Quote posts are not included; " +
            "find those with `getxapi#tweet/advanced_search` and " +
            "`quoted_tweet_id:<id>` in `q`.",
        docsUrl: "https://docs.getxapi.com/docs/tweets/retweeters",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/tweet/retweeters" },
    input: { schema: { queryParams: zTweetRetweetersQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "reposters page",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
