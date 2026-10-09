import { z } from "zod";
import { zGoogleLocale, zMapsDataId } from "../../../../schema/common.ts";

/** GET /google/maps/posts query params (litescrape.com/docs/google-maps-posts, 2026-09-20). */
export const zGoogleMapsPostsQueryParams = z.object({
    data_id: zMapsDataId.describe(
        "Hexadecimal Maps feature ID in the form '0x123:0x456' (the data_id on a Maps result).",
    ),
    next_page_token: z.string().min(16).max(4096).describe(
        "Continuation token from a previous posts response.",
    ).optional(),
    ...zGoogleLocale,
}).strict();
