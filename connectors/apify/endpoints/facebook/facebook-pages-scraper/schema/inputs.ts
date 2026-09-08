import { z } from "zod";

/**
 * apify/facebook-pages-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/apify~facebook-pages-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zFacebookPagesScraperBody = z.object({
    "startUrls": z.array(z.any()).describe(
        "Provide urls of Facebook pages you want to get information from. Only works on facebook pages, not personal profiles (not even public ones).",
    ),
});
