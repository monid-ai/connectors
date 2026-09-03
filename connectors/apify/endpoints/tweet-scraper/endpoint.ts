import { defineEndpoint } from "@shared/core";
import { zTweetScraperBody } from "./schema/inputs.ts";

/**
 * apidojo/tweet-scraper — Search Tweets on X. Pure data; the async
 * machinery is inherited leaf-wise from the apify provider. (v1's
 * catalog-visibility restriction is HOSTED policy — never doc identity.)
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Tweets on X",
        summary:
            "Scrape X (Twitter) tweets from search queries, profiles, lists, and tweet URLs at scale.",
        description:
            "Scrapes X (Twitter) tweets from search queries, profile " +
            "handles, list URLs, and tweet URLs at scale. Returns tweet " +
            "text, timestamps, tweet and profile URLs, engagement metrics, " +
            "author/profile metadata, media attachments, geolocation " +
            "information, and language tags. Supports advanced search " +
            "query syntax, combined Latest and Top search modes, and " +
            "filters for time ranges, geotargeting, language, verified " +
            "accounts, media presence, and engagement thresholds. " +
            "`maxItems` caps the total result count. Runs asynchronously.",
        docsUrl: "https://apify.com/apidojo/tweet-scraper",
        categories: ["twitter"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/apidojo~tweet-scraper/runs",
    },
    input: { schema: { body: zTweetScraperBody } },
});
