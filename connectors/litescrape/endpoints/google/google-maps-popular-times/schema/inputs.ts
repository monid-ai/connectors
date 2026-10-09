import { z } from "zod";
import { zGoogleLocale } from "../../../../schema/common.ts";

/** GET /google/maps/popular-times query params
 *  (litescrape.com/docs/google-maps-popular-times, 2026-09-20). */
export const zGoogleMapsPopularTimesQueryParams = z.object({
    place_id: z.string().min(1).describe(
        "Google place ID from a Maps result.",
    ),
    ...zGoogleLocale,
}).strict();
