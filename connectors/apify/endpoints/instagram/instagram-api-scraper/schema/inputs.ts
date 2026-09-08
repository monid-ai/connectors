import { z } from "zod";

/**
 * apify/instagram-api-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/apify~instagram-api-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zInstagramApiScraperBody = z.object({
    "directUrls": z.array(z.string()).describe(
        "Add one or more Instagram URLs to scrape. The field is optional, but you need to either use this field or search query below.",
    ).optional(),
    "resultsType": z.enum([
        "posts",
        "comments",
        "details",
        "mentions",
        "reels",
        "stories",
    ]).describe(
        "You can choose to get posts, comments or details from Instagram URLs. Comments can only be scraped from post URLs.❗Please note that the stories type has been deprecated. It used to return reels data, which wasn’t aligned with its purpose. Please use reels instead.",
    ).optional(),
    "resultsLimit": z.number().int().min(1).describe(
        "How many posts or comments (max 50 comments per post) you want to scrape from each Instagram URL. If you set this to 1, you will get a single post from each page.",
    ).optional(),
    "onlyPostsNewerThan": z.string().describe(
        "Limit how far back to the history the scraper should go. The date should be in YYYY-MM-DD or full ISO absolute format or in relative format e.g. 1 days, 2 months, 3 years. All time values are taken in UTC timezone",
    ).optional(),
    "search": z.string().describe(
        "Provide a search query which will be used to search Instagram for profiles, hashtags or places.",
    ).optional(),
    "searchType": z.enum(["user", "hashtag", "place"]).describe(
        "What type of pages to search for (you can look for hashtags, profiles or places).",
    ).optional(),
    "searchLimit": z.number().int().min(1).max(250).describe(
        "How many search results (hashtags, users or places) should be returned.",
    ).optional(),
    "addParentData": z.boolean().describe(
        "Only for feed items - add data source to results, i.e. for profile posts metadata is profile, for tag posts metadata is hashtag",
    ).optional(),
});
