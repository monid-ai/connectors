import { z } from "zod";

/**
 * apify/instagram-search-scraper — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-10 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zInstagramSearchScraperOutputItem = z.object({
    id: z.any().describe("Unique Instagram user ID — profile results only")
        .optional(),
    username: z.any().describe(
        "Instagram username of the profile — profile results only",
    ).optional(),
    url: z.any().describe("URL of the Instagram profile or hashtag page")
        .optional(),
    fullName: z.any().describe(
        "Full display name of the user — profile results only",
    ).optional(),
    biography: z.any().describe("Profile biography text — profile results only")
        .optional(),
    externalUrl: z.any().describe(
        "External URL linked in the profile bio — profile results only",
    ).optional(),
    externalUrlShimmed: z.any().describe(
        "Shimmed (tracked) version of the external URL — profile results only",
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
        "Total number of posts on the profile — profile results only",
    ).optional(),
    latestPosts: z.any().describe(
        "Most recent posts from the profile — profile results only",
    ).optional(),
    hasPublicStory: z.any().describe(
        "Whether the profile currently has a public story — profile results only",
    ).optional(),
    isRestrictedProfile: z.any().describe(
        "Whether the profile is restricted (e.g. age-gated) — profile results only",
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
    latestMedia: z.any().describe(
        "ISO 8601 date of the latest reel media — user live search results only",
    ).optional(),
    mediaCount: z.any().describe(
        "Number of posts using this hashtag — hashtag live search results only",
    ).optional(),
    name: z.any().describe(
        "Hashtag name (without #) or place name — hashtag and location results only",
    ).optional(),
    related: z.any().describe("Related hashtags — hashtag results only")
        .optional(),
    frequent: z.any().describe(
        "Hashtags frequently used alongside this one — hashtag results only",
    ).optional(),
    topPosts: z.any().describe(
        "Top posts for this hashtag — hashtag results only",
    ).optional(),
    city: z.any().describe(
        "City the place is located in — place live search results only",
    ).optional(),
    facebookPlacesId: z.any().describe(
        "Facebook Places ID linked to this location — place live search results only",
    ).optional(),
    shortName: z.any().describe(
        "Short display name of the place — place live search results only",
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
    phone: z.any().describe("Phone number of the place — location results only")
        .optional(),
    hours: z.any().describe(
        "Opening hours of the place — location results only",
    ).optional(),
    website: z.any().describe(
        "Website URL of the place — location results only",
    ).optional(),
    posts: z.any().describe(
        "Recent posts at the location — location results only",
    ).optional(),
    inputUrl: z.any().describe(
        "Input URL or search query used to find this result",
    ).optional(),
    searchTerm: z.any().describe("Search term used to find this result")
        .optional(),
    searchSource: z.any().describe(
        "Source of the search that found this result",
    ).optional(),
    facebookPage: z.any().describe("Facebook page linked to the result")
        .optional(),
    threadsNetProfile: z.any().describe(
        "Threads.net profile linked to this account",
    ).optional(),
    error: z.any().describe(
        "Error code if the result could not be fully scraped",
    ).optional(),
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
export const zInstagramSearchScraperOutput = z.array(
    zInstagramSearchScraperOutputItem.or(z.record(z.string(), z.unknown())),
);
