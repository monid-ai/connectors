import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
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
    request: {
        method: "POST",
        path: "/v2/acts/apidojo~tiktok-scraper/runs",
    },
    input: { schema: { body: zTiktokScraperBody } },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** maxItems caps the run — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        estimate: presets.estimate.limitIsExact("maxItems", 3),
    },
});
