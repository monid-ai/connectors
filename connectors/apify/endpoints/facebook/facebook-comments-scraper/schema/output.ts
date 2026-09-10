import { z } from "zod";

/**
 * apify/facebook-comments-scraper — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-10 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zFacebookCommentsScraperOutputItem = z.object({
    facebookUrl: z.any().describe(
        "URL of the Facebook post the comment belongs to.",
    ).optional(),
    postTitle: z.any().describe("Title or subject of the parent post.")
        .optional(),
    postDescription: z.any().describe(
        "Description or body text of the parent post.",
    ).optional(),
    commentUrl: z.any().describe("Direct URL to the comment.").optional(),
    commentId: z.any().describe("Facebook comment ID.").optional(),
    id: z.any().describe("Internal numeric ID of the comment.").optional(),
    feedbackId: z.any().describe(
        "Facebook feedback ID associated with the comment.",
    ).optional(),
    name: z.any().describe("Display name of the comment author.").optional(),
    date: z.any().describe(
        "Date and time the comment was posted, in ISO 8601 format.",
    ).optional(),
    text: z.any().describe("Text content of the comment.").optional(),
    attachments: z.any().describe("Media attachments included in the comment.")
        .optional(),
    author: z.any().describe("Raw author object of the comment.").optional(),
    profileUrl: z.any().describe("URL of the commenter's Facebook profile.")
        .optional(),
    profileId: z.any().describe("Facebook profile ID of the commenter.")
        .optional(),
    profileName: z.any().describe("Profile name of the commenter.").optional(),
    profilePicture: z.any().describe("URL of the commenter's profile picture.")
        .optional(),
    likesCount: z.any().describe("Number of likes the comment received.")
        .optional(),
    commentsCount: z.any().describe("Number of replies to this comment.")
        .optional(),
    comments: z.any().describe("Nested replies to this comment.").optional(),
    threadingDepth: z.any().describe(
        "Nesting depth of the comment (0 for top-level).",
    ).optional(),
    replyToCommentId: z.any().describe(
        "ID of the parent comment this is a reply to.",
    ).optional(),
    parentComment: z.any().describe("Parent comment object if this is a reply.")
        .optional(),
    parentReply: z.any().describe(
        "Direct parent reply object if this is a nested reply.",
    ).optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zFacebookCommentsScraperOutput = z.array(
    zFacebookCommentsScraperOutputItem.or(z.record(z.string(), z.unknown())),
);
