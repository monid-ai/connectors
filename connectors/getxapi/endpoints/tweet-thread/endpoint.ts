import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTweetThreadQueryParams } from "./schema/inputs.ts";

/** GET /tweet/thread: Get X (Twitter) Thread. $0.005 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Thread",
        summary: "Resolve a whole self-thread from any tweet in it.",
        description:
            "Given any tweet in a self-thread (an author replying to " +
            "themselves), return the full thread in order from the root: " +
            "every tweet by that author in the chain, with `thread_length` " +
            "and a `complete` flag that is false when part of the chain " +
            "could not be resolved. Replies by other people are not " +
            "included; use `getxapi#tweet/replies` for those. A tweet that " +
            "is not part of a thread comes back as a thread of one.",
        docsUrl: "https://docs.getxapi.com/docs/tweets/tweet-thread",
        categories: ["twitter"],
        notes: [
            "Priced at $0.005 per call, five times the standard read, " +
            "because one call walks the whole chain.",
        ],
    },
    request: { method: "GET", path: "/tweet/thread" },
    input: { schema: { queryParams: zTweetThreadQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "thread",
            consumes: { credit: "default", amount: 0.005 },
        },
    },
});
