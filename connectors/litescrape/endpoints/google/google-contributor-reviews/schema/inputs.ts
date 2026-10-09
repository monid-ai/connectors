import { z } from "zod";
import { zCountry, zLanguage } from "../../../../schema/common.ts";

/** GET /google/contributor-reviews query params
 *  (litescrape.com/docs/google-contributor-reviews, 2026-09-20). */
export const zGoogleContributorReviewsQueryParams = z.object({
    contributor_id: z.string().regex(/^\d{10,32}$/).describe(
        "10 to 32 digit ID from a Google Maps contributor URL.",
    ),
    hl: zLanguage.describe(
        "Review and interface language, such as 'en', 'en-US', or 'fr'. Default 'en'.",
    ).optional(),
    gl: zCountry.describe(
        "Two-letter country code. Default 'us'.",
    ).optional(),
    limit: z.number().int().min(1).max(200).describe(
        "Number of reviews to return, 1-200. Default 200.",
    ).optional(),
}).strict();
