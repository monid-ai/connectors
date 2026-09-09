import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
import { zTiktokProfileScraperBody } from "./schema/inputs.ts";

/**
 * apidojo/tiktok-profile-scraper — Get TikTok Profile. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get TikTok Profile",
        summary: "Scrape TikTok user profiles and full post histories by " +
            "username or URL.",
        description:
            "Scrapes TikTok user profiles and full post histories by " +
            "username or URL. Returns account details (bio, " +
            "verification status, follower/following counts, total " +
            "videos), per-post engagement metrics (views, likes, " +
            "comments, shares, bookmarks), timestamps, hashtags, " +
            "collaboration metadata, video technical metadata " +
            "(dimensions, duration, media URLs, covers), and " +
            "audio/song metadata. Suited for influencer research, " +
            "lead generation, and brand-deal analysis.",
        docsUrl: "https://apify.com/apidojo/tiktok-profile-scraper",
        categories: ["tiktok"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/apidojo~tiktok-profile-scraper/runs",
    },
    input: { schema: { body: zTiktokProfileScraperBody } },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** maxItems caps the run — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        estimate: presets.estimate.limitIsExact("maxItems", 3),
    },
});
