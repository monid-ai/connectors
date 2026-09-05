import { z } from "zod";

/**
 * harvestapi/linkedin-profile-posts — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/harvestapi~linkedin-profile-posts/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zLinkedinProfilePostsBody = z.object({
    "targetUrls": z.array(z.any()).describe(
        "List of LinkedIn profile or company URLs to scrape. Example: `https://www.linkedin.com/in/satyanadella/` will fetch posted or re-posted content by Bill Gates.",
    ).optional(),
    "maxPosts": z.number().int().describe(
        "Maximum number of posts to scrape per each profile or company. Default is 10. This overrides pagination. If you set this to 0, it will scrape all posts.",
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
        "Fetch posts no older than X time. Options: '24h', 'week', 'month'.",
    ).optional(),
    "postedLimitDate": z.string().describe(
        'Scrape posts from now up to and including this date. It supports the [Date time string format](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#date_time_string_format). For example, "2011-10-10", or "2011-10-10T14:48:00.000+09:00" or a timestamp: "628021800000"',
    ).optional(),
    "includeQuotePosts": z.boolean().describe(
        "Include quote posts (shared posts with comments). By default, all posts are scraped.",
    ).optional(),
    "includeReposts": z.boolean().describe(
        "Include reposts (shared posts without comments). By default, all posts are scraped.",
    ).optional(),
    "scrapeReactions": z.boolean().describe("Scrape reactions of posts.")
        .optional(),
    "maxReactions": z.number().int().describe(
        "Maximum number of reactions to scrape per post. Default is 5.",
    ).optional(),
    "postNestedReactions": z.boolean().describe(
        "Whether to add reactions items inside post items. In a case of hundreds of reactions, the Actor might hit the max item size limit and won't be able to save a post.",
    ).optional(),
    "scrapeComments": z.boolean().describe("Scrape comments of posts.")
        .optional(),
    "maxComments": z.number().int().describe(
        "Maximum number of comments to scrape per post. Default is 5.",
    ).optional(),
    "commentsPostedLimit": z.enum(["any", "1h", "24h", "week", "month"])
        .describe(
            "Fetch comments no older than X time. Options: '24h', 'week', 'month'.",
        ).optional(),
    "postNestedComments": z.boolean().describe(
        "Whether to add comments items inside post items. In a case of hundreds of comments, the Actor might hit the max item size limit and won't be able to save a post.",
    ).optional(),
    "contextCountry": z.enum(["any", "US", "GB", "DE", "FR"]).describe(
        "Set the context country for LinkedIn. This can affect the content you see on LinkedIn, as it may vary by region.",
    ).optional(),
});
