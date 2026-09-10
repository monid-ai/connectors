import { z } from "zod";

/**
 * trudax/reddit-scraper-lite — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-10 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zRedditScraperLiteOutputItem = z.object({
    id: z.any().describe("Unique identifier of the item").optional(),
    parsedId: z.any().describe("Cleaned up ID").optional(),
    url: z.any().describe("Direct URL to the item").optional(),
    username: z.any().describe("Reddit username of the author").optional(),
    userId: z.any().describe("Reddit user ID of the author").optional(),
    authorFlair: z.any().describe(
        "User flair text in the subreddit where the post/comment was made",
    ).optional(),
    title: z.any().describe("Title of the post").optional(),
    communityName: z.any().describe("Subreddit name prefixed with r/")
        .optional(),
    parsedCommunityName: z.any().describe("Subreddit name without prefix")
        .optional(),
    category: z.any().describe("Category or subreddit name").optional(),
    body: z.any().describe("Text content").optional(),
    html: z.any().describe("HTML content").optional(),
    link: z.any().describe("External link or Reddit post link").optional(),
    postId: z.any().describe("ID of the parent post (for comments)").optional(),
    parentId: z.any().describe("ID of the parent (post or comment)").optional(),
    numberOfComments: z.any().describe("Number of comments on a post")
        .optional(),
    numberOfReplies: z.any().describe("Number of replies to a comment")
        .optional(),
    flair: z.any().describe("Link flair text of the post").optional(),
    upVotes: z.any().describe("Number of upvotes").optional(),
    upVoteRatio: z.any().describe("Ratio of upvotes to total votes").optional(),
    isVideo: z.any().describe("Whether the post is a video").optional(),
    isAd: z.any().describe("Whether the post is an advertisement").optional(),
    over18: z.any().describe("Whether the post is NSFW (over 18)").optional(),
    videoUrls: z.array(z.string()).describe("URL of the video if applicable")
        .optional(),
    thumbnailUrl: z.any().describe("URL of the thumbnail").optional(),
    imageUrls: z.array(z.string()).describe("List of image URLs in the post")
        .optional(),
    createdAt: z.any().describe("ISO timestamp of creation").optional(),
    scrapedAt: z.any().describe("ISO timestamp of scraping").optional(),
    dataType: z.any().describe(
        "The type of data ('post', 'comment', 'community', 'user')",
    ).optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zRedditScraperLiteOutput = z.array(
    zRedditScraperLiteOutputItem.or(z.record(z.string(), z.unknown())),
);
