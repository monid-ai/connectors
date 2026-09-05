import { z } from "zod";

/**
 * automation-lab/snapchat-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/automation-lab~snapchat-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zSnapchatScraperBody = z.object({
    "usernames": z.array(z.any()).describe(
        "Enter Snapchat usernames, profile URLs, or @handles. Examples: therock, @nba, https://www.snapchat.com/add/djkhaled",
    ),
    "relatedProfilesLimit": z.number().int().min(0).max(50).describe(
        "Optionally scrape up to this many unique related accounts after all seed profiles. Expansion is limited to one hop. Each emitted related profile incurs the normal additional profile charge.",
    ).optional(),
});
