import { defineEndpoint } from "@shared/core";
import { zRedditScraperLiteBody } from "./schema/inputs.ts";

/**
 * trudax/reddit-scraper-lite — Pull Reddit Posts. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pull Reddit Posts",
        summary: "Scrape Reddit posts, comments, communities, and user " +
            "profiles without login.",
        description: "Scrapes Reddit posts, comments, communities, and user " +
            "profiles without login. Returns post and comment " +
            "content with metadata, community information, and user " +
            "data. Supports limiting by number of posts or items " +
            "with results exported in multiple formats.",
        docsUrl: "https://apify.com/trudax/reddit-scraper-lite",
        categories: ["reddit"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/trudax~reddit-scraper-lite/runs",
    },
    input: { schema: { body: zRedditScraperLiteBody } },
});
