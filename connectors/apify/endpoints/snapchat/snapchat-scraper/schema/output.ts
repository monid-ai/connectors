import { z } from "zod";

/**
 * automation-lab/snapchat-scraper — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-10 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zSnapchatScraperOutputItem = z.object({
    username: z.string().describe(
        "Normalized Snapchat username for the requested profile.",
    ).optional(),
    displayName: z.string().describe(
        "Public display name shown on the Snapchat profile.",
    ).optional(),
    profileType: z.enum(["public", "private", "not_found"]).describe(
        "Detected availability and visibility of the Snapchat profile.",
    ).optional(),
    subscriberCount: z.number().describe(
        "Public subscriber count when Snapchat exposes it.",
    ).optional(),
    bio: z.string().describe("Biography shown on the public profile.")
        .optional(),
    websiteUrl: z.string().describe(
        "Website linked from the public profile when available.",
    ).optional(),
    isVerified: z.boolean().describe(
        "Whether Snapchat displays a verification badge for the profile.",
    ).optional(),
    category: z.string().describe(
        "Primary public-profile category exposed by Snapchat.",
    ).optional(),
    subcategory: z.string().describe(
        "More specific public-profile category when available.",
    ).optional(),
    profilePictureUrl: z.string().describe(
        "Direct URL of the profile picture when available.",
    ).optional(),
    snapcodeImageUrl: z.string().describe(
        "Direct URL of the Snapchat Snapcode image when available.",
    ).optional(),
    heroImageUrl: z.string().describe(
        "Direct URL of the public-profile hero image when available.",
    ).optional(),
    hasStory: z.boolean().describe(
        "Whether the profile currently advertises an active Story.",
    ).optional(),
    hasCuratedHighlights: z.boolean().describe(
        "Whether the profile exposes curated highlights.",
    ).optional(),
    hasSpotlightHighlights: z.boolean().describe(
        "Whether the profile exposes Spotlight highlights.",
    ).optional(),
    lensCount: z.number().describe(
        "Number of lenses listed on the profile page.",
    ).optional(),
    highlightCount: z.number().describe(
        "Number of curated highlights listed on the profile page.",
    ).optional(),
    spotlightCount: z.number().describe(
        "Number of Spotlight highlights listed on the profile page.",
    ).optional(),
    relatedAccounts: z.array(z.string()).describe(
        "Usernames Snapchat recommends alongside the public profile.",
    ).optional(),
    createdAt: z.string().describe(
        "Profile creation timestamp in ISO 8601 format when exposed.",
    ).optional(),
    lastUpdatedAt: z.string().describe(
        "Profile update timestamp in ISO 8601 format when exposed.",
    ).optional(),
    businessProfileId: z.string().describe(
        "Snapchat business-profile identifier when exposed.",
    ).optional(),
    address: z.string().describe(
        "Business address shown on the public profile when available.",
    ).optional(),
    url: z.string().describe("Canonical Snapchat profile URL.").optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zSnapchatScraperOutput = z.array(
    zSnapchatScraperOutputItem.or(z.record(z.string(), z.unknown())),
);
