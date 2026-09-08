import { z } from "zod";

/**
 * apify/instagram-profile-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/apify~instagram-profile-scraper/builds/default →
 * actorDefinition.input) on 2026-09-03 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zInstagramProfileScraperBody = z.object({
    // curated: stringList editor — items are username strings
    "usernames": z.array(z.string()).describe(
        "Provide one or several Instagram user names you want to scrape the posts from. The actor will also handle user name IDs.",
    ),
    "includeAboutSection": z.boolean().describe(
        "This feature is for paying users only. If enabled, the scraper will extract information about the account, including date joined, country of origin, and the profile's channel information. Please beware that the country is there ONLY if the user filled in this information.",
    ).optional(),
});
