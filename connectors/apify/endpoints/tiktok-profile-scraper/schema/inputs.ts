import { z } from "zod";

/**
 * apidojo/tiktok-profile-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/apidojo~tiktok-profile-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zTiktokProfileScraperBody = z.object({
    "startUrls": z.array(z.any()).describe(
        "Paste the TikTok URLs, and get the results immediately. User URLs are supported.",
    ).optional(),
    "usernames": z.array(z.any()).describe(
        "Usernames of TikTok users. Paste the usernames and get the results immediately. Please remove @ sign before paste.",
    ).optional(),
    "until": z.string().describe("Returns posts newer than this date.")
        .optional(),
    "since": z.string().describe("Returns posts older than this date.")
        .optional(),
    "maxItems": z.number().int().describe(
        "Maximum number of items that you want as output.",
    ).optional(),
    "customMapFunction": z.string().describe(
        "Function that takes each of the objects as argument and returns data that will be mapped by the function itself. This function is not intended for filtering, please don't use it for filtering purposes or you will get banned automatically.",
    ).optional(),
});
