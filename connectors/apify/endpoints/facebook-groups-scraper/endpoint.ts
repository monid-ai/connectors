import { defineEndpoint } from "@shared/core";
import { zFacebookGroupsScraperBody } from "./schema/inputs.ts";

/**
 * apify/facebook-groups-scraper — Pull Facebook Group Posts. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pull Facebook Group Posts",
        summary: "Scrape posts and comments from public Facebook groups.",
        description:
            "Scrapes posts and comments from public Facebook groups. " +
            "Returns post text and URLs, author identifiers, " +
            "timestamps, engagement metrics (likes, reactions, " +
            "shares, reaction breakdowns), top comments with " +
            "metadata, attachments and media assets (image/video " +
            "URLs, thumbnails, dimensions), and OCR-extracted text " +
            "from images. Supports sorting and filtering by " +
            "relevance, timeframe, activity, or keyword.",
        docsUrl: "https://apify.com/apify/facebook-groups-scraper",
        categories: ["facebook"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/apify~facebook-groups-scraper/runs",
    },
    input: { schema: { body: zFacebookGroupsScraperBody } },
});
