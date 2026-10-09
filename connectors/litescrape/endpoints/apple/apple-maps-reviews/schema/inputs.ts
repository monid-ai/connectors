import { z } from "zod";
import { zAppleLocale, zMuid } from "../../../../schema/apple.ts";

/** GET /apple/maps/reviews query params (litescrape.com/docs/apple-maps-reviews, 2026-09-20). */
export const zAppleMapsReviewsQueryParams = z.object({
    muid: zMuid.describe(
        "Exactly one Apple Maps place id (an unsigned 64-bit decimal as a string).",
    ),
    locale: zAppleLocale,
}).strict();
