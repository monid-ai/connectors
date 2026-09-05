import { defineEndpoint } from "@shared/core";
import { zInstagramHashtagScraperBody } from "./schema/inputs.ts";

/**
 * apify/instagram-hashtag-scraper — Track Instagram Hashtag. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Track Instagram Hashtag",
        summary: "Scrape Instagram posts and reels by hashtag or keyword " +
            "with engagement metrics.",
        description: "Scrapes Instagram posts and reels by hashtag or " +
            "keyword. Returns engagement metrics (likes, comments, " +
            "reshares, video views/plays), captions, timestamps, " +
            "location data, creator identity, tagged users, " +
            "mentions, carousel child items, music/audio " +
            "attribution, image/video URLs, and related hashtag " +
            "discovery. Supports both hashtag and keyword-based " +
            "discovery modes.",
        docsUrl: "https://apify.com/apify/instagram-hashtag-scraper",
        categories: ["instagram"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/apify~instagram-hashtag-scraper/runs",
    },
    input: { schema: { body: zInstagramHashtagScraperBody } },
});
