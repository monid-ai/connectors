import { defineEndpoint } from "@shared/core";
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
    request: {
        method: "POST",
        path: "/v2/acts/practicaltools~apify-reddit-api/runs",
    },
    input: { schema: { body: zApifyRedditApiBody } },
});
