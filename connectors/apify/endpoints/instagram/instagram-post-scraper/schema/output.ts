import { z } from "zod";

/**
 * apify/instagram-post-scraper — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-10 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zInstagramPostScraperOutputItem = z.object({
    id: z.any().describe("Unique identifier of the post").optional(),
    type: z.any().describe("Type of the post (Image, Video, Sidecar, etc.)")
        .optional(),
    shortCode: z.any().describe("Short code used in the post URL").optional(),
    caption: z.any().describe("Caption text of the post").optional(),
    hashtags: z.any().describe("Hashtags extracted from the post caption")
        .optional(),
    mentions: z.any().describe("User mentions extracted from the post caption")
        .optional(),
    url: z.any().describe("URL of the Instagram post").optional(),
    commentsCount: z.any().describe("Number of comments on the post")
        .optional(),
    firstComment: z.any().describe("Text of the first comment on the post")
        .optional(),
    latestComments: z.any().describe(
        "Array of the most recent comments on the post",
    ).optional(),
    dimensionsHeight: z.any().describe(
        "Height of the post image or video in pixels",
    ).optional(),
    dimensionsWidth: z.any().describe(
        "Width of the post image or video in pixels",
    ).optional(),
    originalHeight: z.any().describe(
        "Height of the originally uploaded photo in pixels, before Instagram's resize. Instagram serves images at most 1080px wide, so this may be larger than dimensionsHeight.",
    ).optional(),
    originalWidth: z.any().describe(
        "Width of the originally uploaded photo in pixels, before Instagram's resize. Instagram serves images at most 1080px wide, so this may be larger than dimensionsWidth.",
    ).optional(),
    displayUrl: z.any().describe("URL of the post thumbnail image").optional(),
    images: z.any().describe(
        "URLs of all images in the post (carousel posts have multiple)",
    ).optional(),
    videoUrl: z.any().describe("URL of the post video file").optional(),
    audioUrl: z.any().describe(
        "URL of the audio stream for reel posts with separate audio",
    ).optional(),
    alt: z.any().describe("Accessibility caption (alt text) of the post image")
        .optional(),
    likesCount: z.any().describe("Number of likes on the post").optional(),
    videoViewCount: z.any().describe(
        "Number of views for video posts. Deprecated by Instagram; may be null or stale. Prefer videoPlayCount.",
    ).optional(),
    videoPlayCount: z.any().describe("Number of plays for video posts")
        .optional(),
    igPlayCount: z.any().describe(
        "Instagram-specific play count for video posts",
    ).optional(),
    fbLikeCount: z.any().describe("Number of Facebook likes on the post")
        .optional(),
    fbPlayCount: z.any().describe("Number of Facebook plays for video posts")
        .optional(),
    reshareCount: z.any().describe("Number of times the post was reshared")
        .optional(),
    timestamp: z.any().describe(
        "ISO 8601 timestamp when the post was published",
    ).optional(),
    childPosts: z.any().describe("Child posts in a carousel (sidecar) post")
        .optional(),
    ownerUsername: z.any().describe("Username of the post author").optional(),
    ownerId: z.any().describe("Instagram user ID of the post author")
        .optional(),
    ownerFullName: z.any().describe("Full display name of the post author")
        .optional(),
    isPinned: z.any().describe(
        "Whether the post is pinned to the top of the profile",
    ).optional(),
    productType: z.any().describe(
        "Product type of the post (e.g., feed, clips, igtv)",
    ).optional(),
    videoDuration: z.any().describe("Duration of the video in seconds")
        .optional(),
    paidPartnership: z.any().describe("Whether the post is a paid partnership")
        .optional(),
    affiliate: z.any().describe("Whether the post contains affiliate content")
        .optional(),
    sponsors: z.any().describe("Sponsors tagged in the paid partnership post")
        .optional(),
    taggedUsers: z.any().describe("Users tagged in the post by the author")
        .optional(),
    musicInfo: z.any().describe(
        "Music or audio attribution information for the post",
    ).optional(),
    coauthorProducers: z.any().describe(
        "Co-author producers credited on the post",
    ).optional(),
    locationName: z.any().describe("Name of the location tagged in the post")
        .optional(),
    locationId: z.any().describe("ID of the location tagged in the post")
        .optional(),
    pk: z.any().describe("Primary key of the post from the Instagram API")
        .optional(),
    redirectedFromUrl: z.any().describe(
        "Original URL that redirected to this post",
    ).optional(),
    isCommentsDisabled: z.any().describe(
        "Whether comments are disabled on the post",
    ).optional(),
    inputUrl: z.any().describe("Input URL that was used to find this post")
        .optional(),
    searchTerm: z.any().describe("Search term used to find this post")
        .optional(),
    searchSource: z.any().describe("Source of the search that found this post")
        .optional(),
    facebookPage: z.any().describe("Facebook page linked to the post author")
        .optional(),
    threadsNetProfile: z.any().describe(
        "Threads.net profile linked to the post author",
    ).optional(),
    metaData: z.any().describe(
        "Additional metadata from the parent profile (present when addParentData is enabled)",
    ).optional(),
    sharesCount: z.any().describe(
        "Number of shares/reposts of the reel (reel scraper only, when includeSharesCount is enabled)",
    ).optional(),
    transcript: z.any().describe(
        "Transcript of the reel audio (reel scraper only, when includeTranscript is enabled)",
    ).optional(),
    downloadedVideo: z.any().describe(
        "URL to the downloaded video file in the Apify key-value store (reel scraper only, when includeDownloadedVideo is enabled)",
    ).optional(),
    error: z.any().describe("Error code if the post could not be fully scraped")
        .optional(),
    errorDescription: z.any().describe(
        "Human-readable description of the error",
    ).optional(),
    requestErrorMessages: z.any().describe(
        "Array of error messages encountered during scraping",
    ).optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zInstagramPostScraperOutput = z.array(
    zInstagramPostScraperOutputItem.or(z.record(z.string(), z.unknown())),
);
