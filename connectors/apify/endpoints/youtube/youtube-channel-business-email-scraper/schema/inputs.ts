import { z } from "zod";

/**
 * dataovercoffee/youtube-channel-business-email-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/dataovercoffee~youtube-channel-business-email-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zYoutubeChannelBusinessEmailScraperBody = z.object({
    "channels": z.array(z.any()).describe(
        "Provide a list of YouTube channel URLs, channel handles (starting with '@'), or 24-character channel IDs. Each entry should identify a unique YouTube channel from which to extract business emails.",
    ),
    "scrape_fresh_emails": z.boolean().describe(
        "Forces a new scrape directly from YouTube for every channel in this run. A surcharge of $0.28 per result applies on top of the standard $0.12 rate ($0.40 total).",
    ).optional(),
});
