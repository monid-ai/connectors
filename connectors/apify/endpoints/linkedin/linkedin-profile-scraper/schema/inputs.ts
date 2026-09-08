import { z } from "zod";

/**
 * dev_fusion/linkedin-profile-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/dev_fusion~linkedin-profile-scraper/builds/default →
 * actorDefinition.input) on 2026-09-03 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zLinkedinProfileScraperBody = z.object({
    // curated: stringList editor — items are profile URL strings
    "profileUrls": z.array(z.string()).describe(
        "Enter the Linkedin URLs of the people, you want to enrich data.",
    ),
});
