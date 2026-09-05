import { defineEndpoint } from "@shared/core";
import { zTiktokVideoScraperBody } from "./schema/inputs.ts";

/**
 * clockworks/tiktok-video-scraper — Get TikTok Video. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
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
    request: {
        method: "POST",
        path: "/v2/acts/clockworks~tiktok-video-scraper/runs",
    },
    input: { schema: { body: zTiktokVideoScraperBody } },
});
