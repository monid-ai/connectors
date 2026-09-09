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
    input: { schema: { body: zTiktokScraperBody } },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** maxItems caps the run — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "RESULT": body.maxItems !== undefined && body.maxItems > 0
                        ? Math.floor(body.maxItems)
                        : 3,
                },
            };
        },
    },
});
