import { z } from "zod";

/**
 * compass/google-maps-reviews-scraper — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-10 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zGoogleMapsReviewsScraperOutputItem = z.object({
    text: z.any().describe(
        "Original text of the review in the reviewer's language",
    ).optional(),
    textTranslated: z.any().describe(
        "Translated review text in the target language",
    ).optional(),
    publishAt: z.any().describe("Publication date in relative format")
        .optional(),
    publishedAtDate: z.string().describe("Publication date in ISO 8601 format")
        .optional(),
    likesCount: z.number().describe("Number of likes the review received")
        .optional(),
    reviewId: z.any().describe("Unique identifier for the review").optional(),
    reviewUrl: z.any().describe("Direct URL to the review").optional(),
    stars: z.any().describe("Star rating (1-5)").optional(),
    rating: z.any().describe(
        "Rating from external providers such as Tripadvisor",
    ).optional(),
    responseFromOwnerDate: z.any().describe(
        "Date when the business owner responded to the review",
    ).optional(),
    responseFromOwnerText: z.any().describe(
        "Text of the owner's response to the review",
    ).optional(),
    reviewImageUrls: z.array(z.string()).describe(
        "Array of image URLs attached to the review",
    ).optional(),
    reviewContext: z.record(z.string(), z.any()).describe(
        "Additional context about the review (e.g., visit type)",
    ).optional(),
    reviewDetailedRating: z.record(z.string(), z.any()).describe(
        "Detailed ratings for specific aspects (e.g., food, service, atmosphere)",
    ).optional(),
    reviewOrigin: z.any().describe(
        'Where the review originates, known values: "Google" and "Tripadvisor"',
    ).optional(),
    visitedIn: z.any().describe("Month and year when the place was visited")
        .optional(),
    originalLanguage: z.any().describe("Language code of the original content")
        .optional(),
    translatedLanguage: z.any().describe(
        "Language code of the translated content",
    ).optional(),
    name: z.any().describe("Full name of the reviewer").optional(),
    reviewerId: z.any().describe("Unique identifier for the reviewer")
        .optional(),
    reviewerUrl: z.any().describe("URL to the reviewer's Google Maps profile")
        .optional(),
    reviewerNumberOfReviews: z.any().describe(
        "Total number of reviews written by this reviewer",
    ).optional(),
    reviewerPhotoUrl: z.any().describe("URL to the reviewer's profile photo")
        .optional(),
    isLocalGuide: z.boolean().describe(
        "Whether the reviewer is a Google Local Guide",
    ).optional(),
    title: z.string().describe("Name/title of the place").optional(),
    placeId: z.string().describe("Unique Google Place ID").optional(),
    address: z.any().describe("Full address of the place").optional(),
    location: z.any().describe(
        "Geographic coordinates (latitude and longitude)",
    ).optional(),
    categories: z.array(z.string()).describe(
        "Array of category names for the place",
    ).optional(),
    isAdvertisement: z.boolean().describe(
        "Whether this place is a paid advertisement",
    ).optional(),
    categoryName: z.any().describe("Primary category name").optional(),
    totalScore: z.any().describe("Average rating score (0-5)").optional(),
    permanentlyClosed: z.boolean().describe(
        "Whether the place is permanently closed",
    ).optional(),
    temporarilyClosed: z.boolean().describe(
        "Whether the place is temporarily closed",
    ).optional(),
    reviewsCount: z.any().describe("Total number of reviews").optional(),
    url: z.string().describe("Google Maps URL for the place").optional(),
    price: z.any().describe('Price level indicator (e.g., "$", "$$", "$$$")')
        .optional(),
    cid: z.any().describe("Google CID (Customer ID) - numeric identifier")
        .optional(),
    fid: z.any().describe(
        "Feature ID - More info at https://dataforseo.com/help-center/what-is-cid-place-id-feature-id",
    ).optional(),
    imageUrl: z.any().describe("URL of the main place image").optional(),
    hotelStars: z.any().describe("Hotel star rating (for hotels)").optional(),
    scrapedAt: z.string().describe(
        "Timestamp when the data was scraped (ISO 8601)",
    ).optional(),
    searchPageUrl: z.string().describe(
        "URL of the search page where this place was found",
    ).optional(),
    searchString: z.string().describe("Search query used to find this place")
        .optional(),
    inputPlaceId: z.string().describe("Place ID from the input if specified")
        .optional(),
    inputStartUrl: z.string().describe("Start URL from the input if specified")
        .optional(),
    language: z.string().describe("Language code used for scraping").optional(),
    rank: z.number().describe("Position in search results (1-based)")
        .optional(),
    kgmid: z.any().describe("Google Knowledge Graph ID").optional(),
    businessProfileId: z.any().describe("Business Profile ID").optional(),
    neighborhood: z.any().describe("Neighborhood or district name").optional(),
    street: z.any().describe("Street address including building number")
        .optional(),
    city: z.any().describe("City name").optional(),
    countryCode: z.any().describe(
        "Two-letter country code (ISO 3166-1 alpha-2)",
    ).optional(),
    postalCode: z.any().describe("Postal or ZIP code").optional(),
    state: z.any().describe("State or province name").optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zGoogleMapsReviewsScraperOutput = z.array(
    zGoogleMapsReviewsScraperOutputItem.or(z.record(z.string(), z.unknown())),
);
