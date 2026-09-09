import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstagramPostScraperBody } from "./schema/inputs.ts";

/**
 * apify/instagram-post-scraper — Get Instagram Post. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Instagram Post",
        summary: "Extract post-level metadata from Instagram profiles and " +
            "post URLs.",
        description: "Extracts comprehensive post-level metadata from " +
            "Instagram profiles and post URLs. Returns captions, " +
            "hashtags, mentions, tagged users, media URLs (images, " +
            "carousels, reels/videos), image dimensions, alt text, " +
            "timestamps, engagement metrics (likes, comments, " +
            "replies, video views/plays), recent comment samples, " +
            "video duration, and flags for pinned, sponsored, and " +
            "paid partnership posts.",
        docsUrl: "https://apify.com/apify/instagram-post-scraper",
        categories: ["instagram"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apify/instagram-post-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apify~instagram-post-scraper/runs",
    },
    input: {
        schema: {
            // the actor accepts an absent resultsLimit (scrapes unbounded;
            // live schema has prefill 20 only — an editor hint, NOT a
            // server default) — WE require it, and require the per-profile
            // multiplier array non-empty: the estimate must be deducible
            // to price the hold (D24)
            body: zInstagramPostScraperBody.extend({
                "username": zInstagramPostScraperBody.shape.username.min(1),
            }).required({ "resultsLimit": true }),
        },
    },
    usage: {
        // SURVEY-corrected: v1 priced this PER_CALL, but the actor's
        // published charge event is per item — metered, not flat.
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** resultsLimit caps EACH profile entry (post-URL entries yield one
         *  item each, so this bounds them too) — both required at the
         *  binding, so the estimate is pure arithmetic (D24). */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "RESULT": body.resultsLimit * body.username.length,
                },
            };
        },
    },
});
