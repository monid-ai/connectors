import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYoutubeScraperBody } from "./schema/inputs.ts";

/**
 * streamers/youtube-scraper — Pull YouTube Videos. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
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
            // maxResults is the primary limiting knob — WE require it at
            // the binding, but keep the published floor min(0): 0 is a
            // MEANINGFUL literal ("crawl no regular videos"), not an
            // unbounded sentinel — the actor's own startUrls description
            // says "If you only want to scrape shorts/streams, set
            // Maximum search results to 0" (published schema, verified
            // 2026-09-08). The secondary caps (maxResultsShorts,
            // maxResultStreams) get the actor's VERIFIED published
            // default (0) at the binding so the estimate can read them.
            // The two source lists (searchQueries, startUrls) stay
            // optional, as on the actor (D25).
            body: zYoutubeScraperBody.required({ maxResults: true })
                .extend({
                    maxResultsShorts: zYoutubeScraperBody.shape
                        .maxResultsShorts.unwrap().default(0),
                    maxResultStreams: zYoutubeScraperBody.shape
                        .maxResultStreams.unwrap().default(0),
                }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            // the actor's charge-event this leaf line joins to
            vendor: "result",
            // survey-pinned GOLD-tier event price
            consumes: { credit: "default", amount: 0.0024 },
        },
        /** (maxResults + maxResultsShorts + maxResultStreams) ×
         *  (searchQueries + startUrls) — maxResults is required at the
         *  binding and the shorts/streams caps carry the actor's
         *  published default (0); the caps are summed (the old estimate
         *  missed the shorts/streams caps; v1 PER_QUERY_LIMIT read
         *  maxResults only). The source lists are optional and absent ≡
         *  empty, so an all-empty source set estimates 0, which is
         *  correct (D25). */
        estimate: ({ data }) => {
            const body = data.input.body;
            const cap = body.maxResults + body.maxResultsShorts +
                body.maxResultStreams;
            const n = (body.searchQueries?.length ?? 0) +
                (body.startUrls?.length ?? 0);
            return { counts: { "RESULT": cap * n } };
        },
    },
});
