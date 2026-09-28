import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTweetDetailQueryParams } from "./schema/inputs.ts";

/** GET /tweet/detail: Get X (Twitter) Post. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Post",
        summary: "One tweet by id, with author, media, and engagement counts.",
        description:
            "Fetch a single tweet by its numeric id: text, creation time, " +
            "like, repost, reply, quote, view and bookmark counts, media, " +
            "language, the full author profile, and the quoted or reposted " +
            "tweet when present. The id is the number after `/status/` in a " +
            "tweet URL. For the replies under it, use " +
            "`getxapi#tweet/replies`; for the whole self-thread it belongs " +
            "to, `getxapi#tweet/thread`.",
        docsUrl: "https://docs.getxapi.com/docs/tweets/tweet-detail",
        categories: ["twitter"],
    },
    request: { method: "GET", path: "/tweet/detail" },
    input: { schema: { queryParams: zTweetDetailQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "tweet",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
