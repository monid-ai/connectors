import { z } from "zod";
import {
    playListingShape,
    zAge,
    zPlayCategory,
} from "../../../../schema/google-play.ts";

/** GET /google/play/apps query params (litescrape.com/docs/google-play-apps, 2026-09-20). */
export const zGooglePlayAppsQueryParams = z.object({
    ...playListingShape,
    apps_category: zPlayCategory.describe(
        "Native category identifier, such as 'MEDICAL' or 'GAME_PUZZLE'. Cannot be combined with q or an explicit store_device.",
    ).optional(),
    store_device: z.enum([
        "phone",
        "tablet",
        "tv",
        "chromebook",
        "watch",
        "car",
    ]).describe(
        "Device storefront to browse. Omit for phone; an explicit value cannot be combined with q or a category.",
    ).optional(),
    age: zAge.describe(
        "Children's age range. Requires apps_category 'FAMILY'.",
    ).optional(),
}).strict();
