import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
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
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/streamers/youtube-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/streamers~youtube-scraper/runs",
    },
    input: { schema: { body: zYoutubeScraperBody } },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** maxResults × (startUrls + searchQueries) — TWO multiplier
         *  arrays, so an inline fn. The schema is the source of truth:
         *  typed body access, no probing. */
        estimate: ({ data }) => {
            const body = data.input.body;
            if (body.maxResults === undefined) {
                return { counts: { "RESULT": 3 } };
            }
            const n = (body.startUrls?.length ?? 0) +
                (body.searchQueries?.length ?? 0);
            return { counts: { "RESULT": body.maxResults * Math.max(n, 1) } };
        },
    },
});
