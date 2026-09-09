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
    input: {
        schema: {
            // the two source lists (searchQueries, startUrls) are
            // either/or on the actor with absent ≡ empty; startUrls has a
            // live server default ([], in the schema) but searchQueries
            // does not — WE materialize [] for it so the multiplier is
            // deterministic after validation (D24)
            body: zYoutubeScraperBody.extend({
                "searchQueries": zYoutubeScraperBody.shape.searchQueries
                    .unwrap().default([]),
            }),
        },
    },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** (maxResults + maxResultsShorts + maxResultStreams) ×
         *  (searchQueries + startUrls) — all three caps carry the actor's
         *  server default (0) and are summed (the old estimate missed the
         *  shorts/streams caps; v1 PER_QUERY_LIMIT read maxResults only),
         *  so the estimate is pure arithmetic (D24). */
        estimate: ({ data }) => {
            const body = data.input.body;
            const cap = body.maxResults + body.maxResultsShorts +
                body.maxResultStreams;
            const n = body.searchQueries.length + body.startUrls.length;
            return { counts: { "RESULT": cap * n } };
        },
    },
});
