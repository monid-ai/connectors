import { z } from "zod";
import { zGoogleLocale } from "../../../../schema/common.ts";

/** GET /google/maps/photo-meta query params
 *  (litescrape.com/docs/google-maps-photo-meta, 2026-09-20). */
export const zGoogleMapsPhotoMetaQueryParams = z.object({
    data_id: z.string().regex(/^[A-Za-z0-9_-]+$/).describe(
        "Google Maps photo ID (letters, digits, underscores, hyphens); follow a photo_meta_link from a place result.",
    ),
    ...zGoogleLocale,
}).strict();
