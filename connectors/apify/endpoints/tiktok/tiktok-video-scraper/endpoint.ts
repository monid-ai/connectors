import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokVideoScraperBody } from "./schema/inputs.ts";

/**
 * clockworks/tiktok-video-scraper — Get TikTok Video. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get TikTok Video",
        summary: "Extract metadata and engagement metrics from specific " +
            "TikTok video URLs.",
        description: "Extracts structured metadata and engagement metrics " +
            "from specific TikTok video URLs. Returns video " +
            "captions, media URLs, play/view counts, likes, " +
            "comments, shares, creation timestamp, country of " +
            "origin, paid/organic status, hashtags, music metadata " +
            "(track name, author, duration), and basic creator " +
            "profile information (display name, avatar, bio, " +
            "follower counts). Can also retrieve cover images, " +
            "slideshow images, subtitles, and video files.",
        docsUrl: "https://apify.com/clockworks/tiktok-video-scraper",
        categories: ["tiktok"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/clockworks/tiktok-video-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/clockworks~tiktok-video-scraper/runs",
    },
    input: {
        schema: {
            // postURLs (the per-url multiplier) stays the plain
            // actor-required mirror — an empty list is a genuine zero-item
            // promise. The secondary knobs the estimate reads get the
            // actor's OWN verified server defaults at the binding
            // (D24/D25), materialized into the body before any hook runs.
            body: zTiktokVideoScraperBody.extend({
                scrapeRelatedVideos: zTiktokVideoScraperBody.shape
                    .scrapeRelatedVideos.unwrap().default(false),
                resultsPerPage: zTiktokVideoScraperBody.shape
                    .resultsPerPage.unwrap().default(1),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            // vendor charge event: "result"
            // survey-pinned GOLD-tier event price
            consumes: { credit: "default", amount: 0.001 },
        },
        /** one video per post URL, PLUS resultsPerPage related videos per
         *  URL when scrapeRelatedVideos is on (PR #2 finding — every
         *  related record bills as an item). The binding pins the actor's
         *  OWN server defaults (scrapeRelatedVideos false, resultsPerPage
         *  1, verified live), materialized into the body before any hook
         *  runs; postURLs is actor-required — pure arithmetic (D24). */
        estimate: ({ data }) => {
            const body = data.input.body;
            const related = body.scrapeRelatedVideos ? body.resultsPerPage : 0;
            return {
                counts: { "RESULT": body.postURLs.length * (1 + related) },
            };
        },
    },
});
