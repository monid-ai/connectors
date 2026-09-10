import { z } from "zod";

/**
 * apify/instagram-api-scraper — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-10 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zInstagramApiScraperOutputItem = z.object({
    id: z.any().describe("Unique identifier of the post or user").optional(),
    type: z.any().describe(
        "Type of the post (Image, Video, Sidecar, etc.) — post results only",
    ).optional(),
    shortCode: z.any().describe(
        "Short code used in the post URL — post results only",
    ).optional(),
    caption: z.any().describe("Caption text of the post — post results only")
        .optional(),
    hashtags: z.any().describe(
        "Hashtags extracted from the post caption — post results only",
    ).optional(),
    mentions: z.any().describe(
        "User mentions extracted from the post caption — post results only",
    ).optional(),
    url: z.any().describe("URL of the post or profile").optional(),
    commentsCount: z.any().describe(
        "Number of comments on the post — post results only",
    ).optional(),
    firstComment: z.any().describe(
        "Text of the first comment on the post — post results only",
    ).optional(),
    latestComments: z.any().describe(
        "Array of the most recent comments on the post — post results only",
    ).optional(),
    dimensionsHeight: z.any().describe(
        "Height of the post image or video in pixels — post results only",
    ).optional(),
    dimensionsWidth: z.any().describe(
        "Width of the post image or video in pixels — post results only",
    ).optional(),
    originalHeight: z.any().describe(
        "Height of the originally uploaded photo in pixels, before Instagram's resize. Instagram serves images at most 1080px wide, so this may be larger than dimensionsHeight.",
    ).optional(),
    originalWidth: z.any().describe(
        "Width of the originally uploaded photo in pixels, before Instagram's resize. Instagram serves images at most 1080px wide, so this may be larger than dimensionsWidth.",
    ).optional(),
    displayUrl: z.any().describe(
        "URL of the post thumbnail image — post results only",
    ).optional(),
    images: z.any().describe(
        "URLs of all images in the post (carousel posts have multiple) — post results only",
    ).optional(),
    videoUrl: z.any().describe("URL of the post video file — post results only")
        .optional(),
    audioUrl: z.any().describe(
        "URL of the audio stream for reel posts with separate audio — post results only",
    ).optional(),
    alt: z.any().describe(
        "Accessibility caption (alt text) of the post image — post results only",
    ).optional(),
    likesCount: z.any().describe(
        "Number of likes on the post — post results only",
    ).optional(),
    videoViewCount: z.any().describe(
        "Number of views for video posts — post results only. Deprecated by Instagram; may be null or stale. Prefer videoPlayCount.",
    ).optional(),
    videoPlayCount: z.any().describe(
        "Number of plays for video posts — post results only",
    ).optional(),
    igPlayCount: z.any().describe(
        "Instagram-specific play count for video posts — post results only",
    ).optional(),
    fbLikeCount: z.any().describe(
        "Number of Facebook likes on the post — post results only",
    ).optional(),
    fbPlayCount: z.any().describe(
        "Number of Facebook plays for video posts — post results only",
    ).optional(),
    reshareCount: z.any().describe(
        "Number of times the post was reshared — post results only",
    ).optional(),
    timestamp: z.any().describe(
        "ISO 8601 timestamp when the post was published — post results only",
    ).optional(),
    childPosts: z.any().describe(
        "Child posts in a carousel (sidecar) post — post results only",
    ).optional(),
    ownerUsername: z.any().describe(
        "Username of the post author — post results only",
    ).optional(),
    ownerId: z.any().describe(
        "Instagram user ID of the post author — post results only",
    ).optional(),
    ownerFullName: z.any().describe(
        "Full display name of the post author — post results only",
    ).optional(),
    isPinned: z.any().describe(
        "Whether the post is pinned to the top of the profile — post results only",
    ).optional(),
    productType: z.any().describe(
        "Product type of the post (e.g., feed, clips, igtv) — post results only",
    ).optional(),
    videoDuration: z.any().describe(
        "Duration of the video in seconds — post results only",
    ).optional(),
    paidPartnership: z.any().describe(
        "Whether the post is a paid partnership — post results only",
    ).optional(),
    affiliate: z.any().describe(
        "Whether the post contains affiliate content — post results only",
    ).optional(),
    sponsors: z.any().describe(
        "Sponsors tagged in a paid partnership post — post results only",
    ).optional(),
    taggedUsers: z.any().describe(
        "Users tagged in the post by the author — post results only",
    ).optional(),
    musicInfo: z.any().describe(
        "Music or audio attribution information for the post — post results only",
    ).optional(),
    coauthorProducers: z.any().describe(
        "Co-author producers credited on the post — post results only",
    ).optional(),
    locationName: z.any().describe(
        "Name of the location tagged in the post — post results only",
    ).optional(),
    locationId: z.any().describe(
        "ID of the location tagged in the post — post results only",
    ).optional(),
    pk: z.any().describe(
        "Primary key of the post from the Instagram API — post results only",
    ).optional(),
    redirectedFromUrl: z.any().describe(
        "Original URL that redirected to this post — post results only",
    ).optional(),
    isCommentsDisabled: z.any().describe(
        "Whether comments are disabled on the post — post results only",
    ).optional(),
    username: z.any().describe(
        "Instagram username of the profile — profile results only",
    ).optional(),
    fullName: z.any().describe(
        "Full display name of the user — profile results only",
    ).optional(),
    biography: z.any().describe("Profile biography text — profile results only")
        .optional(),
    externalUrl: z.any().describe(
        "External URL linked in the profile bio — profile results only",
    ).optional(),
    externalUrlShimmed: z.any().describe(
        "Shimmed version of the external URL — profile results only",
    ).optional(),
    externalUrls: z.any().describe(
        "All bio links added to the profile — profile results only",
    ).optional(),
    followersCount: z.any().describe(
        "Number of followers the profile has — profile results only",
    ).optional(),
    followsCount: z.any().describe(
        "Number of accounts the profile follows — profile results only",
    ).optional(),
    hasChannel: z.any().describe(
        "Whether the profile has an Instagram broadcast channel — profile results only",
    ).optional(),
    highlightReelCount: z.any().describe(
        "Number of highlight reels on the profile — profile results only",
    ).optional(),
    isBusinessAccount: z.any().describe(
        "Whether the account is a business account — profile results only",
    ).optional(),
    joinedRecently: z.any().describe(
        "Whether the account joined Instagram recently — profile results only",
    ).optional(),
    businessCategoryName: z.any().describe(
        "Business category of the account — profile results only",
    ).optional(),
    private: z.any().describe(
        "Whether the profile is private — profile results only",
    ).optional(),
    verified: z.any().describe(
        "Whether the profile has a verified badge — profile results only",
    ).optional(),
    profilePicUrl: z.any().describe(
        "URL of the profile picture — profile results only",
    ).optional(),
    profilePicUrlHD: z.any().describe(
        "URL of the high-resolution profile picture — profile results only",
    ).optional(),
    igtvVideoCount: z.any().describe(
        "Number of IGTV videos on the profile — profile results only",
    ).optional(),
    relatedProfiles: z.any().describe(
        "Related Instagram profiles suggested by Instagram — profile results only",
    ).optional(),
    latestIgtvVideos: z.any().describe(
        "Most recent IGTV videos from the profile — profile results only",
    ).optional(),
    postsCount: z.any().describe(
        "Total number of posts on the profile or for the hashtag — profile and hashtag results only",
    ).optional(),
    latestPosts: z.any().describe(
        "Most recent posts from the profile, or latest hashtag posts (when enabled) — profile and hashtag results only",
    ).optional(),
    hasPublicStory: z.any().describe(
        "Whether the profile currently has a public story — profile results only",
    ).optional(),
    isRestrictedProfile: z.any().describe(
        "Whether the profile is restricted — profile results only",
    ).optional(),
    restrictionReason: z.any().describe(
        "Reason the profile is restricted, if applicable — profile results only",
    ).optional(),
    businessAddress: z.any().describe(
        "Business address associated with the profile — profile results only",
    ).optional(),
    fbid: z.any().describe(
        "Facebook ID linked to the Instagram profile — profile results only",
    ).optional(),
    facebookPage: z.any().describe(
        "Connected Facebook page — profile results only (string) or search enrichment (object)",
    ).optional(),
    name: z.any().describe(
        "Name of the place or hashtag — location and hashtag results only",
    ).optional(),
    location_id: z.any().describe(
        "Unique identifier of the place — location results only",
    ).optional(),
    lat: z.any().describe(
        "Latitude coordinate of the place — location results only",
    ).optional(),
    lng: z.any().describe(
        "Longitude coordinate of the place — location results only",
    ).optional(),
    address: z.any().describe(
        "Street address of the place — location results only",
    ).optional(),
    website: z.any().describe(
        "Website URL of the place — location results only",
    ).optional(),
    phone: z.any().describe("Phone number of the place — location results only")
        .optional(),
    hours: z.any().describe(
        "Opening hours of the place — location results only",
    ).optional(),
    posts: z.any().describe(
        "Recent posts at the location — location results only",
    ).optional(),
    related: z.any().describe("Related hashtags — hashtag results only")
        .optional(),
    frequent: z.any().describe(
        "Frequently co-occurring hashtags — hashtag results only",
    ).optional(),
    topPosts: z.any().describe(
        "Top posts for the hashtag (when includeTopPosts is enabled) — hashtag results only",
    ).optional(),
    inputUrl: z.any().describe("Input URL that was used to find this item")
        .optional(),
    searchTerm: z.any().describe("Search term used to find this item")
        .optional(),
    searchSource: z.any().describe("Source of the search that found this item")
        .optional(),
    threadsNetProfile: z.any().describe(
        "Threads.net profile linked to this account — profile results only",
    ).optional(),
    metaData: z.any().describe(
        "Additional metadata from the parent profile (present when addParentData is enabled) — post results only",
    ).optional(),
    error: z.any().describe("Error code if the item could not be fully scraped")
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
export const zInstagramApiScraperOutput = z.array(
    zInstagramApiScraperOutputItem.or(z.record(z.string(), z.unknown())),
);
