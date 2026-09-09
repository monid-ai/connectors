import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zApifyRedditApiBody } from "./schema/inputs.ts";

/**
 * practicaltools/apify-reddit-api — Reddit API. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Reddit API",
        summary: "Extract structured Reddit data via Reddit's official " +
            "OAuth2 API: subreddits, posts, comments, users.",
        description: "Extracts structured Reddit data via Reddit's official " +
            "OAuth2 API. Returns subreddit metadata, post metadata " +
            "(title, body text, timestamps, vote counts, comment " +
            "counts, media links), comment threads with nested " +
            "replies, and user profile metadata including karma and " +
            "recent activity. Supports URL-driven mode (subreddit " +
            "feeds, individual posts with comments, user profiles) " +
            "and search mode (site-wide or subreddit-scoped keyword " +
            "search) with configurable sorting and time filters. " +
            "Suited for training AI models, bulk historical data, " +
            "and sentiment analysis.",
        docsUrl: "https://apify.com/practicaltools/apify-reddit-api",
        categories: ["reddit"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/practicaltools/apify-reddit-api",
    request: {
        method: "POST",
        path: "/v2/acts/practicaltools~apify-reddit-api/runs",
    },
    input: { schema: { body: zApifyRedditApiBody } },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** maxItems per startUrl — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "RESULT": body.maxItems !== undefined
                        ? body.maxItems *
                            Math.max(body.startUrls?.length ?? 0, 1)
                        : 3,
                },
            };
        },
    },
});
