import { z } from "zod";

/**
 * axesso_data/amazon-search-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/axesso_data~amazon-search-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zAmazonSearchScraperBody = z.object({
    "input": z.array(z.any()).describe(
        "List of inputs, each entry refers to one keyword to be pulled. Full list of valid parameter can be found in the README tab.",
    ),
});
