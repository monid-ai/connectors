import { z } from "zod";

/**
 * apify/facebook-reviews-scraper — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-10 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zFacebookReviewsScraperOutputItem = z.object({
    facebookUrl: z.any().describe(
        "URL of the Facebook page the reviews were scraped from.",
    ).optional(),
    id: z.any().describe("Internal numeric ID of the review.").optional(),
    legacyId: z.any().describe("Legacy numeric post ID of the review.")
        .optional(),
    user: z.any().describe("User who wrote the review.").optional(),
    date: z.any().describe(
        "Date and time the review was posted, in ISO 8601 format.",
    ).optional(),
    url: z.any().describe("Direct URL to the review.").optional(),
    isRecommended: z.any().describe("Whether the reviewer recommends the page.")
        .optional(),
    text: z.any().describe("Text content of the review.").optional(),
    tags: z.any().describe("Tags attached to the review.").optional(),
    likesCount: z.any().describe("Number of likes the review received.")
        .optional(),
    photos: z.any().describe("Photos attached to the review.").optional(),
    commentsCount: z.any().describe("Number of comments on the review.")
        .optional(),
    comments: z.any().describe("Comments on the review.").optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zFacebookReviewsScraperOutput = z.array(
    zFacebookReviewsScraperOutputItem.or(z.record(z.string(), z.unknown())),
);
