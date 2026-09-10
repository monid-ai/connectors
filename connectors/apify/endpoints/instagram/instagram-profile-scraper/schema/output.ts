import { z } from "zod";

/**
 * apify/instagram-profile-scraper — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-10 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zInstagramProfileScraperOutputItem = z.object({
    id: z.any().describe("Unique Instagram user ID").optional(),
    username: z.any().describe("Instagram username of the profile").optional(),
    url: z.any().describe("URL of the Instagram profile").optional(),
    fullName: z.any().describe("Full display name of the user").optional(),
    biography: z.any().describe("Profile biography text").optional(),
    externalUrl: z.any().describe("External URL linked in the profile bio")
        .optional(),
    externalUrlShimmed: z.any().describe(
        "Shimmed (tracked) version of the external URL",
    ).optional(),
    externalUrls: z.any().describe("All bio links added to the profile")
        .optional(),
    followersCount: z.any().describe("Number of followers the profile has")
        .optional(),
    followsCount: z.any().describe("Number of accounts the profile follows")
        .optional(),
    hasChannel: z.any().describe(
        "Whether the profile has an Instagram broadcast channel",
    ).optional(),
    highlightReelCount: z.any().describe(
        "Number of highlight reels on the profile",
    ).optional(),
    isBusinessAccount: z.any().describe(
        "Whether the account is a business account",
    ).optional(),
    joinedRecently: z.any().describe(
        "Whether the account joined Instagram recently",
    ).optional(),
    businessCategoryName: z.any().describe("Business category of the account")
        .optional(),
    private: z.any().describe("Whether the profile is private").optional(),
    verified: z.any().describe("Whether the profile has a verified badge")
        .optional(),
    profilePicUrl: z.any().describe("URL of the profile picture").optional(),
    profilePicUrlHD: z.any().describe(
        "URL of the high-resolution profile picture",
    ).optional(),
    facebookPage: z.any().describe("Connected Facebook page name").optional(),
    igtvVideoCount: z.any().describe("Number of IGTV videos on the profile")
        .optional(),
    relatedProfiles: z.any().describe(
        "Related Instagram profiles suggested by Instagram",
    ).optional(),
    latestIgtvVideos: z.any().describe(
        "Most recent IGTV videos from the profile",
    ).optional(),
    postsCount: z.any().describe("Total number of posts on the profile")
        .optional(),
    latestPosts: z.any().describe("Most recent posts from the profile")
        .optional(),
    hasPublicStory: z.any().describe(
        "Whether the profile currently has a public story",
    ).optional(),
    isRestrictedProfile: z.any().describe(
        "Whether the profile is restricted (e.g. age-gated)",
    ).optional(),
    restrictionReason: z.any().describe(
        "Reason the profile is restricted, if applicable",
    ).optional(),
    businessAddress: z.any().describe(
        "Business address associated with the profile",
    ).optional(),
    fbid: z.any().describe("Facebook ID linked to the Instagram profile")
        .optional(),
    searchTerm: z.any().describe("Search term used to find this profile")
        .optional(),
    searchSource: z.any().describe(
        "Source of the search that found this profile",
    ).optional(),
    threadsNetProfile: z.any().describe(
        "Threads.net profile linked to this account",
    ).optional(),
    inputUrl: z.any().describe(
        "Original input URL that was used to find this profile",
    ).optional(),
    error: z.any().describe(
        "Error code if the profile could not be fully scraped",
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
export const zInstagramProfileScraperOutput = z.array(
    zInstagramProfileScraperOutputItem.or(z.record(z.string(), z.unknown())),
);
