import { defineEndpoint } from "@shared/core";
import { zYoutubeScraperBody } from "./schema/inputs.ts";

/**
 * streamers/youtube-scraper — Pull YouTube Videos. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pull YouTube Videos",
        summary: "Scrape YouTube videos, channels, playlists, and search " +
            "results with full metadata and engagement metrics.",
        description:
            "Scrapes YouTube videos, channels, and search results by " +
            "direct URL or search term \u2014 an alternative YouTube API " +
            "with no limits or quotas. Returns video metadata " +
            "(titles, descriptions, durations, release dates), " +
            "engagement metrics (views, likes, comments), channel " +
            "metadata (subscribers, total videos, total views, " +
            "location, social links), playlist and stream listings, " +
            "thumbnails, hashtags, and monetization signals. Can " +
            "download subtitles/transcripts in common formats. " +
            "Supports filtering by video type (regular, shorts, " +
            "streams) and date ranges.",
        docsUrl: "https://apify.com/streamers/youtube-scraper",
        categories: ["youtube"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/streamers~youtube-scraper/runs",
    },
    input: { schema: { body: zYoutubeScraperBody } },
});
