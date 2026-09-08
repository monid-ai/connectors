import { z } from "zod";

/**
 * apify/instagram-post-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/apify~instagram-post-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zInstagramPostScraperBody = z.object({
    "username": z.array(z.any()).describe(
        "Insert the username or URL of any profile you want to get posts from. You can also paste the post URLs.",
    ),
    "resultsLimit": z.number().int().min(1).describe(
        "This is the maximum number of posts you want to scrape per profile. If you set it to 5, you'll get 5 posts for each profile you've included. This setting does not apply if you're scraping by post URLs.",
    ).optional(),
    "skipPinnedPosts": z.boolean().describe(
        "Check if you do not want to save pinned posts.",
    ).optional(),
    "onlyPostsNewerThan": z.string().describe(
        "Limit how far back to the history the scraper should go. The date should be in YYYY-MM-DD or full ISO absolute format or in relative format e.g. 1 days, 2 months, 3 years. All time values are taken in UTC timezone",
    ).optional(),
    "dataDetailLevel": z.enum(["basicData", "detailedData"]).describe(
        "Choose the data package you want to extract. Please note the Detailed data are paid extra.",
    ).optional(),
});
