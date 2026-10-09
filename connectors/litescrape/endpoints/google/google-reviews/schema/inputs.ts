import { z } from "zod";
import { zCountry, zLanguage, zMapsDataId } from "../../../../schema/common.ts";

/** GET /google/reviews query params (litescrape.com/docs/google-maps-reviews, 2026-09-20). */
export const zGoogleReviewsQueryParams = z.object({
    place_id: z.string().min(1).describe(
        "Google place ID of the business. Required unless data_id is supplied.",
    ).optional(),
    data_id: zMapsDataId.describe(
        "Hexadecimal Maps feature ID in the form '0x123:0x456'. Required unless place_id is supplied.",
    ).optional(),
    sort_by: z.enum(["qualityScore", "newestFirst", "ratingHigh", "ratingLow"])
        .describe("Review order. Default 'qualityScore'.").optional(),
    hl: zLanguage.describe(
        "Language for review labels and place context. Default 'en'.",
    ).optional(),
    gl: zCountry.describe(
        "Two-letter country code, lowercase. Default 'us'.",
    ).optional(),
    query: z.string().min(1).describe(
        "Only reviews matching this free-text query. Cannot be combined with topic_id.",
    ).optional(),
    topic_id: z.string().min(1).describe(
        "Only reviews under this topic from the topics group. Cannot be combined with query.",
    ).optional(),
    num: z.number().int().min(1).max(100).describe(
        "Number of reviews: 1-100 on an unfiltered first request, 1-20 on filtered or continuation requests. Default 8.",
    ).optional(),
    source_metadata: z.boolean().describe(
        "Include review-provider icon and scale metadata when available.",
    ).optional(),
    next_page_token: z.string().min(1).describe(
        "Continuation token from pagination.next_page_token, passed back unchanged.",
    ).optional(),
}).strict();
