import { defineEndpoint } from "@shared/core";
import { zGoogleNewsScraperFastBody } from "./schema/inputs.ts";

/**
 * data_xplorer/google-news-scraper-fast — Search Google News. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Google News",
        summary: "Scrape real-time Google News articles by keyword, " +
            "topic, or section across 50+ markets.",
        description: "Scrapes Google News articles in real time by keyword " +
            "search, predefined topics, or custom section URLs. " +
            "Returns article headlines, publisher names, direct " +
            "article URLs, publication timestamps, article " +
            "descriptions, and high-resolution images. Supports " +
            "parallel multi-keyword processing and region/language " +
            "targeting across 50+ markets. Suited for news " +
            "monitoring and market research.",
        docsUrl: "https://apify.com/data_xplorer/google-news-scraper-fast",
        categories: ["news-search"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/data_xplorer~google-news-scraper-fast/runs",
    },
    input: { schema: { body: zGoogleNewsScraperFastBody } },
});
