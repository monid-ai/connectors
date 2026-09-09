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
    input: { schema: { body: zInstagramPostScraperBody } },
    usage: {
        // SURVEY-corrected: v1 priced this PER_CALL, but the actor's
        // published charge event is per item — metered, not flat.
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "RESULT": body.resultsLimit !== undefined
                        ? body.resultsLimit *
                            Math.max(body.username.length, 1)
                        : 3,
                },
            };
        },
    },
});
