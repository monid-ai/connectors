import { z } from "zod";

/**
 * apify/facebook-comments-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/apify~facebook-comments-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zFacebookCommentsScraperBody = z.object({
    "startUrls": z.array(z.any()).describe("Valid facebook URL"),
    "resultsLimit": z.number().int().min(1).describe(
        "If this limit is not set as many results as possible are returned",
    ).optional(),
    "includeNestedComments": z.boolean().describe(
        "If checked, the actor will return up to 3 levels of comments/replies for each post. Note that each reply/comment will be returned as a separate result.",
    ).optional(),
    "viewOption": z.enum([
        "RANKED_THREADED",
        "RECENT_ACTIVITY",
        "RANKED_UNFILTERED",
    ]).describe("Choose the way the comments are sorted").optional(),
    "onlyCommentsNewerThan": z.string().describe(
        "Limit how far back to the history the scraper should go. The date should be in YYYY-MM-DD or full ISO absolute format or in relative format e.g. 1 year, 2 months, 3 days, 4 hours, or 5 minutes. All time values are taken in UTC timezone. This add-on feature is billed separately.",
    ).optional(),
});
