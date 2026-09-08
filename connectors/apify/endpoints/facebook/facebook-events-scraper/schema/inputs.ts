import { z } from "zod";

/**
 * apify/facebook-events-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/apify~facebook-events-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zFacebookEventsScraperBody = z.object({
    "searchQueries": z.array(z.any()).describe(
        "Search you want to use to discover new events. You can provide search for topics, such as 'Sport', or for places, such as 'New York', or combine them 'Sport New York'.",
    ).optional(),
    "startUrls": z.array(z.any()).describe(
        "URLs to start with. You can provide URLs of event details here or search/explore URLs, e.g. 'https://www.facebook.com/events/1023978871819924' or 'https://www.facebook.com/events/search/?q=Party' or 'https://www.facebook.com/events/explore/fr-paris/110774245616525' or 'https://www.facebook.com/ev...",
    ).optional(),
    "maxEvents": z.number().int().min(1).describe(
        "Maximum number of events you want to extract data for. If you leave this field empty, the number of events won't be limited.",
    ).optional(),
});
