import { defineEndpoint } from "@shared/core";
import { zInstagramProfileScraperBody } from "./schema/inputs.ts";

/**
 * apify/instagram-profile-scraper — Get Instagram Profile. Pure data; the
 * async machinery is inherited leaf-wise from the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Instagram Profile",
        summary:
            "Extract public Instagram profile metadata and recent media by username, ID, or URL.",
        description:
            "Extracts public Instagram profile metadata and recent media " +
            "for one or more accounts by username, ID, or URL. Returns " +
            "bio, profile pictures, contact links, business category, " +
            "verification status, audience metrics (followers, following, " +
            "post/video/highlight totals), join date, related accounts, " +
            "and detailed recent media items with captions, hashtags, " +
            "mentions, media URLs, engagement metrics, and tagged users. " +
            "One result per account. Runs asynchronously.",
        docsUrl: "https://apify.com/apify/instagram-profile-scraper",
        categories: ["instagram"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/apify~instagram-profile-scraper/runs",
    },
    input: { schema: { body: zInstagramProfileScraperBody } },
});
