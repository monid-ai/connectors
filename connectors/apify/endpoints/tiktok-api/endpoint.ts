import { defineEndpoint } from "@shared/core";
import { zTiktokApiBody } from "./schema/inputs.ts";

/**
 * scraptik/tiktok-api — TikTok API. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "TikTok API",
        summary: "Access TikTok mobile API data: users, videos, sounds, " +
            "search, comments, followers, and hashtags.",
        description: "Extracts TikTok data via mobile API endpoints across " +
            "users, videos, sounds, search, comments, followers, and " +
            "hashtags. Returns profile data and statistics, " +
            "follower/following lists, video metadata with " +
            "engagement metrics, watermark-free download URLs, " +
            "comment threads and replies, music/track metadata, and " +
            "hashtag trend data. Supports search across users, " +
            "posts, sounds, hashtags, and lives.",
        docsUrl: "https://apify.com/scraptik/tiktok-api",
        categories: ["tiktok"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/scraptik~tiktok-api/runs",
    },
    input: { schema: { body: zTiktokApiBody } },
});
