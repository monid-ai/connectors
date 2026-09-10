import { z } from "zod";

/**
 * apify/facebook-groups-scraper — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-10 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zFacebookGroupsScraperOutputItem = z.object({
    facebookUrl: z.any().describe("URL of the Facebook group that was scraped.")
        .optional(),
    url: z.any().describe("URL of the post.").optional(),
    id: z.any().describe("Facebook post ID.").optional(),
    legacyId: z.any().describe("Legacy numeric Facebook post ID.").optional(),
    feedbackId: z.any().describe(
        "Facebook feedback ID associated with the post.",
    ).optional(),
    time: z.any().describe(
        "Date and time the post was published, in ISO 8601 format.",
    ).optional(),
    title: z.any().describe(
        "Title of the post (e.g. for marketplace-style group posts).",
    ).optional(),
    text: z.any().describe("Text content of the post.").optional(),
    user: z.any().describe("Author of the post.").optional(),
    collaborators: z.any().describe("Collaborators tagged in the post.")
        .optional(),
    attachments: z.any().describe("Media attachments of the post.").optional(),
    likesCount: z.any().describe("Number of likes (reactions) on the post.")
        .optional(),
    sharesCount: z.any().describe("Number of times the post was shared.")
        .optional(),
    commentsCount: z.any().describe("Number of comments on the post.")
        .optional(),
    topComments: z.any().describe("Top comments on the post.").optional(),
    price: z.any().describe("Price listed in the post (for buy/sell groups).")
        .optional(),
    location: z.any().describe("Location mentioned in the post.").optional(),
    link: z.any().describe("External link included in the post.").optional(),
    actionLink: z.any().describe("Call-to-action link object.").optional(),
    previewTitle: z.any().describe(
        "Title of a link preview attached to the post.",
    ).optional(),
    previewDescription: z.any().describe(
        "Description of a link preview attached to the post.",
    ).optional(),
    previewSource: z.any().describe("Source domain of the link preview.")
        .optional(),
    previewTarget: z.any().describe("Target of the link preview.").optional(),
    textReferences: z.any().describe(
        "Entities referenced in the post text (pages, profiles).",
    ).optional(),
    isVideo: z.any().describe("Whether the post contains a video.").optional(),
    viewsCount: z.any().describe("Number of views on the video post.")
        .optional(),
    paidPartnership: z.any().describe(
        "Whether the post is marked as a paid partnership.",
    ).optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zFacebookGroupsScraperOutput = z.array(
    zFacebookGroupsScraperOutputItem.or(z.record(z.string(), z.unknown())),
);
