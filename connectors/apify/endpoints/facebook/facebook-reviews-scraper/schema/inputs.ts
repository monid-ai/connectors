import { z } from "zod";

/**
 * apify/facebook-reviews-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/apify~facebook-reviews-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zFacebookReviewsScraperBody = z.object({
    "startUrls": z.array(z.any()).describe(
        "Facebook Page reviews URL. Add one by one using Add+ or a whole prepared list using Text file button.",
    ),
    "resultsLimit": z.number().int().min(1).describe(
        "If this limit is not set, as many results as possible will be scraped.",
    ).optional(),
    "onlyReviewsNewerThan": z.string().describe(
        "Limit how far back to the history the scraper should go. The date should be in YYYY-MM-DD or full ISO absolute format or in relative format e.g. 1 year, 2 months, 3 days, 4 hours, or 5 minutes. All time values are taken in UTC timezone.",
    ).optional(),
});
