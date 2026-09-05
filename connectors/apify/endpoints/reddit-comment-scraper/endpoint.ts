import { defineEndpoint } from "@shared/core";
import { zRedditCommentScraperBody } from "./schema/inputs.ts";

/**
 * crawlerbros/reddit-comment-scraper — List Reddit Comments. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "List Reddit Comments",
        summary: "Extract full comment threads from Reddit posts with " +
            "scores, authors, and nesting.",
        description:
            "Extracts structured comment data from Reddit posts with " +
            "full thread expansion. Returns comment text, author " +
            "names, engagement metrics (score/karma, awards), " +
            "permalinks, parent-child relationships with nesting " +
            "depth, boolean flags (original poster, edited, " +
            "stickied), and creation timestamps. Automatically " +
            "expands collapsed threads and 'load more' elements to " +
            "capture complete nested comment structures.",
        docsUrl: "https://apify.com/crawlerbros/reddit-comment-scraper",
        categories: ["reddit"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/crawlerbros~reddit-comment-scraper/runs",
    },
    input: { schema: { body: zRedditCommentScraperBody } },
});
