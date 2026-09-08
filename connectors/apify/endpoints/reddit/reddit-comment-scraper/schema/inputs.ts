import { z } from "zod";

/**
 * crawlerbros/reddit-comment-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/crawlerbros~reddit-comment-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zRedditCommentScraperBody = z.object({
    "postUrls": z.array(z.any()).describe(
        "Post URLs, comment URLs, share links or bare post IDs. Accepted forms: full post URL (https://www.reddit.com/r/x/comments/1abc/title/), short URL (https://www.reddit.com/comments/1abc or with ?sort=top), comment URL (.../comments/1abc/title/comment/xyz/), mobile share link (https://www.reddit.com...",
    ),
    "maxComments": z.number().int().min(1).max(100000).describe(
        "Maximum number of comments to scrape from each post (including nested replies).",
    ).optional(),
    "commentSort": z.enum([
        "confidence",
        "top",
        "new",
        "controversial",
        "old",
        "qa",
    ]).describe("How to sort the comment threads.").optional(),
    "includePost": z.boolean().describe(
        "When enabled, the parent post is emitted as the first record of each thread (full post data included).",
    ).optional(),
    "postedAfter": z.string().describe(
        "Only keep comments created on or after this date (UTC).",
    ).optional(),
    "postedBefore": z.string().describe(
        "Only keep comments created on or before this date (interpreted as the end of that day, UTC).",
    ).optional(),
    "minDepth": z.number().int().min(0).max(100).describe(
        "Only keep comments nested at or deeper than this depth (0 = keep everything, 1 = drop top-level comments and keep only replies, 2 = keep only replies-to-replies and deeper, etc.). Leave empty for no limit.",
    ).optional(),
    "maxDepth": z.number().int().min(0).max(100).describe(
        "Only keep comments nested at or above this depth (0 = top-level comments only, 1 = top-level + first-level replies, etc.). Leave empty for no limit.",
    ).optional(),
    "minCommentScore": z.number().int().min(-1000000).max(1000000).describe(
        "Only keep comments with a score (upvotes minus downvotes) at or above this value. Leave empty for no limit.",
    ).optional(),
    "maxCommentScore": z.number().int().min(-1000000).max(1000000).describe(
        "Only keep comments with a score (upvotes minus downvotes) at or below this value. Leave empty for no limit.",
    ).optional(),
    "onlyOP": z.boolean().describe(
        "When enabled, only comments written by the post's original author are kept.",
    ).optional(),
    "excludeDeletedRemoved": z.boolean().describe(
        "When enabled, comments whose body or author show as [deleted] or [removed] are dropped (no real content left to scrape).",
    ).optional(),
    "excludeStickied": z.boolean().describe(
        "When enabled, moderator-pinned (stickied) comments — e.g. AutoModerator notices — are dropped.",
    ).optional(),
    "excludeCollapsed": z.boolean().describe(
        "When enabled, comments Reddit collapses by default (low score or crowd control) are dropped.",
    ).optional(),
    "distinguishedFilter": z.enum(["any", "moderator", "admin", "none"])
        .describe(
            "Restrict output to comments with a specific 'distinguished' badge (moderator/admin posting in an official capacity), or only regular (non-distinguished) comments. Leave as 'Any' to keep everyone.",
        ).optional(),
    "authors": z.array(z.any()).describe(
        "Only keep comments written by these Reddit usernames (case-insensitive). Leave empty to keep comments from all authors.",
    ).optional(),
    "excludeAuthors": z.array(z.any()).describe(
        "Drop comments written by these Reddit usernames (case-insensitive), e.g. bots like AutoModerator. Leave empty to keep comments from all authors. Applied after `authors` (an author listed in both is excluded).",
    ).optional(),
    "keywords": z.array(z.any()).describe(
        "Only keep comments whose body contains at least one of these keywords or phrases (case-insensitive substring match). Leave empty to keep all comments.",
    ).optional(),
    "excludeKeywords": z.array(z.any()).describe(
        "Drop comments whose body contains any of these keywords or phrases (case-insensitive substring match), e.g. spam/boilerplate phrases. Applied after `keywords` (a keyword listed in both still excludes the comment). Leave empty to keep all comments.",
    ).optional(),
    "minAwards": z.number().int().min(0).max(1000000).describe(
        "Only keep comments with at least this many total awards. Leave empty for no limit.",
    ).optional(),
    "minCommentLength": z.number().int().min(0).max(10000).describe(
        "Only keep comments whose body text is at least this many characters long. Useful for filtering out one-word/emoji-only noise when building NLP datasets. Leave empty for no limit.",
    ).optional(),
    "maxCommentLength": z.number().int().min(0).max(10000).describe(
        "Only keep comments whose body text is at most this many characters long (Reddit's hard cap is 10,000 characters). Leave empty for no limit.",
    ).optional(),
    "controversialOnly": z.boolean().describe(
        "When enabled, only keep comments Reddit flags as controversial (near-even up/downvote split, i.e. `controversiality: 1`).",
    ).optional(),
    "focusOnTargetComment": z.boolean().describe(
        "When a `postUrls` item is a specific comment permalink (e.g. .../comments/1abc123/title/comment/xyz987/), only that comment plus its ancestor chain (see `commentContext`) is fetched instead of the full thread. Guarantees the target comment is captured even in huge threads where `maxComments` pagi...",
    ).optional(),
    "commentContext": z.number().int().min(0).max(8).describe(
        "How many levels of parent comments above the target comment to include when `focusOnTargetComment` is enabled (matches Reddit's own comment-permalink page). Ignored otherwise.",
    ).optional(),
});
