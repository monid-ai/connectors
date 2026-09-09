import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
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
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/streamers/youtube-comments-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/streamers~youtube-comments-scraper/runs",
    },
    input: {
        schema: {
            // the actor requires `startUrls` but accepts an empty batch
            // (a no-op run) — WE require it non-empty: it is the
            // estimate's multiplier, which must be deducible to price
            // the hold (D24)
            body: zYoutubeCommentsScraperBody.extend({
                "startUrls": zYoutubeCommentsScraperBody.shape.startUrls
                    .min(1),
            }),
        },
    },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** maxComments per video url (v1 PER_QUERY_LIMIT) — maxComments
         *  carries the actor's server default (1) and startUrls is
         *  non-empty at the binding, so the estimate is pure arithmetic
         *  (D24). */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "RESULT": body.maxComments * body.startUrls.length,
                },
            };
        },
    },
});
