import { z } from "zod";

/**
 * apimint/google-ads-transparency-scraper — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-10-10 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zGoogleAdsTransparencyScraperOutputItem = z.object({
    adId: z.string().describe("Google's creative ID for the ad.").optional(),
    advertiserId: z.string().describe("Google's advertiser ID.").optional(),
    advertiserName: z.string().nullable().describe(
        "Advertiser name as shown in the Transparency Center.",
    ).optional(),
    advertiserLegalName: z.string().nullable().describe(
        "Legal name Google verified for the advertiser, as published by Google.",
    ).optional(),
    advertiserCountry: z.string().nullable().describe(
        "Country the advertiser is based in (ISO 3166 two-letter code).",
    ).optional(),
    advertiserVerified: z.boolean().nullable().describe(
        "True when Google shows the advertiser's identity as verified.",
    ).optional(),
    format: z.string().nullable().describe("text, image or video.").optional(),
    firstShown: z.string().nullable().describe(
        "When the ad was first shown (ISO date-time).",
    ).optional(),
    lastShown: z.string().nullable().describe(
        "When the ad was last shown (ISO date-time).",
    ).optional(),
    daysShown: z.number().int().nullable().describe(
        "Number of days Google reports the ad as shown.",
    ).optional(),
    targetDomain: z.string().nullable().describe(
        "The domain this ad was found under, for domain searches.",
    ).optional(),
    adUrl: z.string().describe(
        "The ad's page in the Google Ads Transparency Center.",
    ).optional(),
    imageUrl: z.string().nullable().describe(
        "The ad image, or the screenshot Google keeps of a text ad.",
    ).optional(),
    imageWidth: z.number().int().nullable().describe(
        "Image width in CSS pixels.",
    ).optional(),
    imageHeight: z.number().int().nullable().describe(
        "Image height in CSS pixels.",
    ).optional(),
    previewUrl: z.string().nullable().describe(
        "Google's live preview script for ads rendered on the fly (video and some text ads).",
    ).optional(),
    videoId: z.string().nullable().describe("YouTube ID of a video ad.")
        .optional(),
    videoUrl: z.string().nullable().describe("Link to the video ad on YouTube.")
        .optional(),
    videoThumbnailUrl: z.string().nullable().describe(
        "YouTube thumbnail of a video ad.",
    ).optional(),
    headline: z.string().nullable().describe(
        "The ad headline as shown (for responsive ads, the combination Google saved).",
    ).optional(),
    description: z.string().nullable().describe(
        "The ad description, without the logo, ratings, reviews or sitelinks.",
    ).optional(),
    displayUrl: z.string().nullable().describe(
        "The URL shown in the ad. Google does not publish the final landing page.",
    ).optional(),
    callToAction: z.string().nullable().describe(
        "Button text of video and app ads.",
    ).optional(),
    sitelinks: z.array(z.any()).describe(
        "Sitelinks shown under the ad: title and, when shown, a description.",
    ).optional(),
    copySource: z.string().describe(
        "Where the copy came from: content (Google's live render, exact), ocr (read from the screenshot) or none.",
    ).optional(),
    copyConfidence: z.number().nullable().describe(
        "Tesseract OCR confidence 0–1, the mean over headline, description and display URL. Null when the copy is exact (content), comes from a vision model (which gives no score), or is absent.",
    ).optional(),
    copyFieldConfidence: z.record(z.string(), z.unknown()).nullable().describe(
        "Tesseract OCR confidence 0–1 for headline, description and displayUrl. Null for a vision model and for exact copy.",
    ).optional(),
    ocrEngine: z.string().nullable().describe(
        'Which reader read the screenshot: "tesseract" or a vision model\'s name. Null when the copy did not come from a screenshot.',
    ).optional(),
    emptyTemplate: z.boolean().describe(
        "True for a local-ad placeholder with no real copy. Delivered free.",
    ).optional(),
    variationCount: z.number().int().nullable().describe(
        "How many versions of the ad Google saved. Null when details are off.",
    ).optional(),
    variations: z.array(z.any()).describe(
        "Every saved version: image or preview URL, plus headline, description and display URL read from its screenshot.",
    ).optional(),
    regions: z.array(z.any()).describe(
        "Countries where the ad ran, with first and last dates. Impressions and per-platform splits are published by Google for EU countries only.",
    ).optional(),
    impressionsMin: z.number().int().nullable().describe(
        "Lower bound of total impressions. EU-served ads only.",
    ).optional(),
    impressionsMax: z.number().int().nullable().describe(
        "Upper bound of total impressions. EU-served ads only.",
    ).optional(),
    targeting: z.record(z.string(), z.unknown()).nullable().describe(
        "Which targeting the advertiser used (demographics, location, contextual), each with targeted and excluded flags. EU-served ads only.",
    ).optional(),
    source: z.record(z.string(), z.any()).describe(
        "Which input produced this row: type (term, domain, advertiser, url) and value.",
    ).optional(),
    matchedTerm: z.string().nullable().describe(
        "The search term that found this advertiser, for search-term inputs.",
    ).optional(),
    scrapedAt: z.string().describe("When this row was scraped (ISO date-time).")
        .optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zGoogleAdsTransparencyScraperOutput = z.array(
    zGoogleAdsTransparencyScraperOutputItem.or(
        z.record(z.string(), z.unknown()),
    ),
);
