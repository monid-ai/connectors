import { z } from "zod";

/**
 * scraptik/tiktok-comments-scraper-api — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/scraptik~tiktok-comments-scraper-api/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zTiktokCommentsScraperApiBody = z.object({
    "listComments_awemeId": z.string().describe(
        "ID of the TikTok post to fetch top-level comments for. Example: 6944028931875949829",
    ).optional(),
    "listComments_count": z.number().int().describe(
        "Number of top-level comments to fetch. Default is 10.",
    ).optional(),
    "listComments_cursor": z.number().int().describe(
        "Pagination cursor to retrieve more top-level comments.",
    ).optional(),
    "commentReplies_commentId": z.string().describe(
        "ID of the parent comment to fetch replies for. Example: 6999860547420766982",
    ).optional(),
    "commentReplies_awemeId": z.string().describe(
        "ID of the TikTok post containing the comment. Example: 6996617408010112262",
    ).optional(),
    "commentReplies_count": z.number().int().describe(
        "Number of replies to fetch. Default is 10.",
    ).optional(),
    "commentReplies_cursor": z.number().int().describe(
        "Pagination cursor to retrieve more comment replies.",
    ).optional(),
});
