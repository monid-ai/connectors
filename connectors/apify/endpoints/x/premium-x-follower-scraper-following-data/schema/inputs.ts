import { z } from "zod";

/**
 * kaitoeasyapi/premium-x-follower-scraper-following-data — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/kaitoeasyapi~premium-x-follower-scraper-following-data/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zPremiumXFollowerScraperFollowingDataBody = z.object({
    "user_names": z.array(z.any()).describe(
        "Enter the user name you want to scrape.don't include @! eg:['elonmusk']",
    ).optional(),
    "user_ids": z.array(z.any()).describe(
        "Enter the user ids you want to scrape. Case1: 1846987139428634858,1858743654778892784. Note: When this field has a value, all other filter conditions will be ignored.",
    ).optional(),
    "maxFollowers": z.number().int().min(200).max(10000000).describe(
        "Maximum number of followers that you want as output.",
    ),
    "maxFollowings": z.number().int().min(200).max(10000000).describe(
        "Maximum number of followings that you want as output.",
    ),
    "getFollowers": z.boolean().describe("Whether to get followers."),
    "getFollowing": z.boolean().describe("Whether to get followings."),
});
