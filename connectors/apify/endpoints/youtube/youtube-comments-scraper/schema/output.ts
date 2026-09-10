import { z } from "zod";

/**
 * streamers/youtube-comments-scraper — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-10 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zYoutubeCommentsScraperOutputItem = z.object({
    author: z.string().describe(
        "The username/display name of the comment author",
    ).optional(),
    comment: z.string().describe("The text content of the comment").optional(),
    cid: z.string().describe("The unique comment ID assigned by YouTube")
        .optional(),
    replyCount: z.number().describe("The number of replies to this comment")
        .optional(),
    replyToCid: z.string().describe(
        "The comment ID this comment is replying to, null if it's a top-level comment",
    ).optional(),
    voteCount: z.number().describe(
        "The number of likes/upvotes the comment has received",
    ).optional(),
    authorIsChannelOwner: z.boolean().describe(
        "Whether the comment author is the owner of the video's channel",
    ).optional(),
    publishedTimeText: z.string().describe(
        "The relative time text when the comment was published (e.g., '2 days ago', '1 week ago')",
    ).optional(),
    type: z.enum(["comment", "reply"]).describe(
        "The type of comment - either a top-level 'comment' or a 'reply' to another comment",
    ).optional(),
    hasCreatorHeart: z.boolean().describe(
        "Whether the video creator has 'hearted' this comment",
    ).optional(),
    videoId: z.string().describe(
        "The unique YouTube video ID that this comment belongs to",
    ).optional(),
    pageUrl: z.string().describe("The full URL of the YouTube video page")
        .optional(),
    commentsCount: z.number().describe(
        "The total number of comments on the video",
    ).optional(),
    title: z.string().describe("The title of the YouTube video").optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zYoutubeCommentsScraperOutput = z.array(
    zYoutubeCommentsScraperOutputItem.or(z.record(z.string(), z.unknown())),
);
