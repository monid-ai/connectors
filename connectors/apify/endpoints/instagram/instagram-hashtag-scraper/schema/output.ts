import { z } from "zod";

/**
 * apify/instagram-hashtag-scraper — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-10 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zInstagramHashtagScraperOutputItem = z.object({
    id: z.any().describe("Unique identifier of the post").optional(),
    type: z.any().describe("Type of the post (e.g., Image, Video, Sidecar)")
        .optional(),
    shortCode: z.any().describe("Short code identifier used in the post URL")
        .optional(),
    caption: z.any().describe("Caption text of the post").optional(),
    hashtags: z.any().describe("Hashtags extracted from the post caption")
        .optional(),
    mentions: z.any().describe("User mentions extracted from the post caption")
        .optional(),
    url: z.any().describe("URL of the Instagram post").optional(),
    commentsCount: z.any().describe("Total number of comments on the post")
        .optional(),
    firstComment: z.any().describe("Text of the first comment on the post")
        .optional(),
    latestComments: z.any().describe("Latest comments on the post").optional(),
    dimensionsHeight: z.any().describe("Height of the post media in pixels")
        .optional(),
    dimensionsWidth: z.any().describe("Width of the post media in pixels")
        .optional(),
    originalHeight: z.any().describe(
        "Height of the originally uploaded photo in pixels, before Instagram's resize. Instagram serves images at most 1080px wide, so this may be larger than dimensionsHeight.",
    ).optional(),
    originalWidth: z.any().describe(
        "Width of the originally uploaded photo in pixels, before Instagram's resize. Instagram serves images at most 1080px wide, so this may be larger than dimensionsWidth.",
    ).optional(),
    displayUrl: z.any().describe("Display image URL of the post").optional(),
    images: z.any().describe("Image URLs for carousel (sidecar) posts")
        .optional(),
    videoUrl: z.any().describe("URL of the video for video posts").optional(),
    audioUrl: z.any().describe(
        "URL of the separate audio stream for reel videos with DASH manifest",
    ).optional(),
    alt: z.any().describe("Accessibility caption (alt text) for the post image")
        .optional(),
    likesCount: z.any().describe("Number of likes on the post").optional(),
    videoViewCount: z.any().describe(
        "Number of views for video posts. Deprecated by Instagram; may be null or stale. Prefer videoPlayCount.",
    ).optional(),
    videoPlayCount: z.any().describe("Number of plays for video posts")
        .optional(),
    igPlayCount: z.any().describe(
        "Instagram internal play count for video posts",
    ).optional(),
    fbLikeCount: z.any().describe("Number of Facebook likes on the post")
        .optional(),
    fbPlayCount: z.any().describe("Number of Facebook plays for video posts")
        .optional(),
    reshareCount: z.any().describe("Number of times the post was reshared")
        .optional(),
    timestamp: z.any().describe("Date and time when the post was published")
        .optional(),
    childPosts: z.any().describe("Child posts for carousel (sidecar) posts")
        .optional(),
    locationName: z.any().describe("Name of the location tagged in the post")
        .optional(),
    locationId: z.any().describe("ID of the location tagged in the post")
        .optional(),
    ownerFullName: z.any().describe("Full name of the post owner").optional(),
    ownerUsername: z.any().describe("Username of the post owner").optional(),
    ownerId: z.any().describe("Instagram user ID of the post owner").optional(),
    productType: z.any().describe(
        "Product type of the post (e.g., clips, feed)",
    ).optional(),
    videoDuration: z.any().describe("Duration of the video in seconds")
        .optional(),
    paidPartnership: z.any().describe("Whether the post is a paid partnership")
        .optional(),
    affiliate: z.any().describe("Whether the post contains affiliate content")
        .optional(),
    sponsors: z.any().describe("Sponsor accounts tagged in the post")
        .optional(),
    taggedUsers: z.any().describe("Users tagged in the post image").optional(),
    isPinned: z.any().describe("Whether the post is pinned to the profile")
        .optional(),
    musicInfo: z.any().describe("Music attribution information for reels")
        .optional(),
    coauthorProducers: z.any().describe(
        "Co-author producers for collaborative posts",
    ).optional(),
    isCommentsDisabled: z.any().describe(
        "Whether comments are disabled on the post",
    ).optional(),
    inputUrl: z.any().describe(
        "Original input URL that was used to find this post",
    ).optional(),
    searchTerm: z.any().describe(
        "Search term that led to this post being scraped",
    ).optional(),
    searchSource: z.any().describe(
        "Source used to find this post (e.g., google, facebook-ads)",
    ).optional(),
    facebookPage: z.any().describe(
        "Facebook page data associated with the post owner",
    ).optional(),
    threadsNetProfile: z.any().describe(
        "Threads.net profile data associated with the post owner",
    ).optional(),
    error: z.any().describe("Error code if scraping this post failed")
        .optional(),
    errorDescription: z.any().describe(
        "Detailed description of the error that occurred",
    ).optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zInstagramHashtagScraperOutput = z.array(
    zInstagramHashtagScraperOutputItem.or(z.record(z.string(), z.unknown())),
);
