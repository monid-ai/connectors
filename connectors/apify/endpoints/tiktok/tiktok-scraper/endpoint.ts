import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokScraperBody } from "./schema/inputs.ts";

/**
 * apidojo/tiktok-scraper — Pull TikTok Posts. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pull TikTok Posts",
        summary: "Extract TikTok posts, videos, profiles, hashtags, " +
            "music, and comments at scale.",
        description: "Extracts TikTok posts, videos, profiles, hashtags, " +
            "music, locations, comments, and subtitles at scale. " +
            "Returns video metadata and media URLs, creator " +
            "profiles, engagement metrics (views, likes, shares, " +
            "comments, bookmarks), hashtag lists, audio metadata, " +
            "subtitle/caption information, and direct post links. " +
            "Supports multi-entity scraping with keyword/search " +
            "discovery, location targeting, and a built-in query " +
            "builder.",
        docsUrl: "https://apify.com/apidojo/tiktok-scraper",
        categories: ["tiktok"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apidojo/tiktok-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apidojo~tiktok-scraper/runs",
    },
    input: {
        schema: {
            // the actor accepts an absent maxItems (scrapes unbounded; live
            // schema has prefill 1000 only — an editor hint, NOT a server
            // default) — WE require it ≥ 1: the estimate must be deducible
            // to price the hold (D24). v1 declared NO estimation label here
            // (fell back to a constant); the actor's own docs make maxItems
            // the total-output cap, so it IS the limiting knob.
            body: zTiktokScraperBody.extend({
                "maxItems": zTiktokScraperBody.shape.maxItems
                    .unwrap().min(1),
            }),
        },
    },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** maxItems caps the total run output — required ≥ 1 at the
         *  binding, so the estimate is pure arithmetic (D24). */
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.maxItems },
        }),
    },
});
