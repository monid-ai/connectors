import { defineEndpoint } from "@shared/core";
import { zSnapchatSpotlightScraperBody } from "./schema/inputs.ts";

/**
 * tri_angle/snapchat-spotlight-scraper — Get Snapchat Spotlight. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Snapchat Spotlight",
        summary: "Extract creator, caption, and engagement data from " +
            "Snapchat Spotlight video URLs.",
        description: "Extracts public metadata from Snapchat Spotlight video " +
            "URLs without a Snapchat login. Returns creator name, " +
            "username, profile URL and thumbnails, the Spotlight " +
            "URL, description, hashtags, view and share counts, " +
            "upload date, video duration, width and height, and " +
            "thumbnail and content media URLs. Supports batches of " +
            "Spotlight URLs in one run. Suited for short-video trend " +
            "tracking, creator performance analysis, and content " +
            "research on Snapchat.",
        docsUrl: "https://apify.com/tri_angle/snapchat-spotlight-scraper",
        categories: ["snapchat"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/tri_angle~snapchat-spotlight-scraper/runs",
    },
    input: { schema: { body: zSnapchatSpotlightScraperBody } },
});
