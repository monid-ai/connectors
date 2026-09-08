import { z } from "zod";

/**
 * cleansyntax/facebook-profile-posts-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/cleansyntax~facebook-profile-posts-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zFacebookProfilePostsScraperBody = z.object({
    "endpoint": z.enum([
        "profile_posts_by_url",
        "profile_posts",
        "search_posts_by_keyword",
        "details_by_id",
        "details_by_url",
        "profile_id_by_url",
    ]).describe("Choose what to fetch."),
    "urls_text": z.string().describe(
        "Use for: Profile posts by URL, Profile details by URL, Profile ID by URL. Paste one URL/username per line.",
    ).optional(),
    "ids_text": z.string().describe(
        "Use for: Profile posts by ID, Profile details by ID. Paste one profile_id per line.",
    ).optional(),
    "keywords_text": z.string().describe(
        "Use for: Search Posts by Keyword. Paste one search query per line.",
    ).optional(),
    "max_posts": z.number().int().min(0).describe(
        "Optional. Limit how many posts to collect per profile or keyword. Set 0 (default) to fetch all available.",
    ).optional(),
    "start_date": z.string().describe(
        "Optional filter for Profile posts and Search posts.",
    ).optional(),
    "end_date": z.string().describe(
        "Optional filter for Profile posts and Search posts.",
    ).optional(),
});
