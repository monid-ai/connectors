import { z } from "zod";

/**
 * harvestapi/linkedin-post-search — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/harvestapi~linkedin-post-search/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zLinkedinPostSearchBody = z.object({
    "searchQueries": z.array(z.any()).describe(
        "Queries to search LinkedIn posts. The same query as you would use in the LinkedIn search bar.",
    ).optional(),
    "maxPosts": z.number().int().describe(
        "Maximum number of posts to scrape per each search query. If you set this to 0, it will scrape all posts.",
    ).optional(),
    "postedLimit": z.enum([
        "any",
        "1h",
        "24h",
        "week",
        "month",
        "3months",
        "6months",
        "year",
    ]).describe(
        "Fetch posts no older than X time. Options: '1h', '24h', 'week', 'month'.",
    ).optional(),
    "postedLimitDate": z.string().describe(
        'Scrape posts from now up to and including this date. It supports the [Date time string format](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#date_time_string_format). For example, "2011-10-10", or "2011-10-10T14:48:00.000+09:00" or a timestamp: "628021800000"',
    ).optional(),
    "sortBy": z.enum(["relevance", "date"]).describe(
        "Sort by 'relevance' or 'date'.",
    ).optional(),
    "authorUrls": z.array(z.any()).describe(
        "List of LinkedIn profile or company URLs to scrape. Example: `https://www.linkedin.com/in/williamhgates` will fetch posted or re-posted content by Bill Gates.",
    ).optional(),
    "authorsCompanies": z.array(z.any()).describe(
        "Scrape posts of profile-authors who assigned to LinkedIn Company Names of these companies. Example: `Google` will fetch posts of Google employees or ex-employees in some cases.",
    ).optional(),
    "mentioningMember": z.array(z.any()).describe(
        "List of LinkedIn profile URLs of members mentioned in posts. Example: `https://www.linkedin.com/in/williamhgates` will fetch posts mentioning Bill Gates.",
    ).optional(),
    "mentioningCompany": z.array(z.any()).describe(
        "List of LinkedIn Company Names mentioned in posts. Example: `https://www.linkedin.com/company/google` will fetch posts mentioning Google.",
    ).optional(),
    "contentType": z.enum([
        "all",
        "videos",
        "images",
        "jobs",
        "live_videos",
        "documents",
        "collaborative_articles",
    ]).describe(
        "Filter posts by content type. For example, if you choose 'Videos', it will scrape only posts containing videos.",
    ).optional(),
    "authorsIndustryId": z.array(z.any()).describe(
        "Scrape posts of profile-authors who assigned to LinkedIn Industry IDs of these industries. Full list: https://github.com/HarvestAPI/linkedin-industry-codes-v2/blob/main/linkedin_industry_code_v2_all_eng.csv",
    ).optional(),
    "authorKeywords": z.string().describe(
        "Scrape posts of profile-authors whose profiles contain at least one of these keywords in the headline or job title sections.",
    ).optional(),
    "profileScraperMode": z.enum(["short", "main"]).describe(
        "Choose the mode for scraping LinkedIn profiles. The Short mode provides basic information, while the Full mode includes full detailed profile data.",
    ).optional(),
    "startPage": z.number().int().min(1).max(100).describe(
        "The page number to start scraping from.",
    ).optional(),
    "scrapePages": z.number().int().min(0).max(100).describe(
        "The number of search pages to scrape. Each page contains 100 posts",
    ).optional(),
    "scrapeReactions": z.boolean().describe("Scrape reactions of posts.")
        .optional(),
    "maxReactions": z.number().int().describe(
        "Maximum number of reactions to scrape per post. Default is 10.",
    ).optional(),
    "reactionsProfileScraperMode": z.enum(["short", "main"]).describe(
        "Choose the mode for scraping LinkedIn profiles. The Short mode provides basic information, while the Full mode includes full detailed profile data.",
    ).optional(),
    "postNestedReactions": z.boolean().describe(
        "Whether to add reactions items inside post items. In a case of hundreds of reactions, the Actor might hit the max item size limit and won't be able to save a post.",
    ).optional(),
    "scrapeComments": z.boolean().describe("Scrape comments of posts.")
        .optional(),
    "commentsPostedLimit": z.enum([
        "any",
        "1h",
        "24h",
        "week",
        "month",
        "3months",
        "6months",
        "year",
    ]).describe(
        "Fetch comments no older than X time. Options: '1h', '24h', 'week', 'month'.",
    ).optional(),
    "maxComments": z.number().int().describe(
        "Maximum number of comments to scrape per post. Default is 10.",
    ).optional(),
    "commentsProfileScraperMode": z.enum(["short", "main"]).describe(
        "Choose the mode for scraping LinkedIn profiles. The Short mode provides basic information, while the Full mode includes full detailed profile data.",
    ).optional(),
    "postNestedComments": z.boolean().describe(
        "Whether to add comments items inside post items. In a case of hundreds of comments, the Actor might hit the max item size limit and won't be able to save a post.",
    ).optional(),
});
