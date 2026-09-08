import { z } from "zod";

/**
 * apify/instagram-search-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/apify~instagram-search-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zInstagramSearchScraperBody = z.object({
    "search": z.string().describe(
        "Provide a keyword which will be used to extract Instagram search results. A keyword can be one or more words. To scrape multiple search terms at once, submit them as a comma-separated list.",
    ),
    "searchType": z.enum(["place", "user", "hashtag", "popular"]).describe(
        "Choose the type of Instagram page to search for (places, profiles, or hashtags), or `Search popular reels` to scrape trending reels for the keyword.",
    ).optional(),
    "searchLimit": z.number().int().min(1).max(250).describe(
        "Set the maximum number of search results (hashtags, users, or places) you want to scrape. If you set it to 5, you'll get 5 results for each search term you've included.",
    ).optional(),
    "enhanceUserSearchWithFacebookPage": z.boolean().describe(
        "For each user from the top 10, the scraper will extract their Facebook page that sometimes contains their business email. Keep in mind that you're forbidden to collect personal data in certain jurisdictions. See this article for more details.",
    ).optional(),
    "liveSearch": z.boolean().describe(
        "Enable this option if you want to get data from a live Instagram search. Please note that the dataset will be slightly different than the one produced by standard search.",
    ).optional(),
});
