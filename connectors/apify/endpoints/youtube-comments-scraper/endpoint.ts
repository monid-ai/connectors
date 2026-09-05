import { defineEndpoint } from "@shared/core";
import { zYoutubeCommentsScraperBody } from "./schema/inputs.ts";

/**
 * streamers/youtube-comments-scraper — List YouTube Comments. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "List YouTube Comments",
        summary: "Extract complete comment threads from YouTube videos: " +
            "text, authors, dates, votes, and replies.",
        description: "Extracts complete YouTube comment threads from one or " +
            "more video URLs, with no API limits or quotas. Returns " +
            "comment text, author identity, posting dates, like/vote " +
            "counts, reply counts, creator/owner endorsement " +
            "indicators, and aggregate comment counts. Supports " +
            "batch processing of multiple videos for sentiment " +
            "analysis, moderation, and community engagement " +
            "analysis.",
        docsUrl: "https://apify.com/streamers/youtube-comments-scraper",
        categories: ["youtube"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/streamers~youtube-comments-scraper/runs",
    },
    input: { schema: { body: zYoutubeCommentsScraperBody } },
});
