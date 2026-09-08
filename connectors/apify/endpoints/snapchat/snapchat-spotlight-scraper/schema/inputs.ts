import { z } from "zod";

/**
 * tri_angle/snapchat-spotlight-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/tri_angle~snapchat-spotlight-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zSnapchatSpotlightScraperBody = z.object({
    "spotlightUrls": z.array(z.any()).describe(
        "Add one or more URLs of Snapchat Spotlights you want to scrape. (e.g. `https://www.snapchat.com/spotlight/W7_EDlXWTBiXAEEniNoMPwAAYdW94bXd5dmF5AYv9OiSkAYv9OiP4AAAAAQ`)",
    ).optional(),
});
