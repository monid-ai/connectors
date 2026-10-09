import { z } from "zod";
import {
    playListingShape,
    zPlayCategory,
} from "../../../../schema/google-play.ts";

/** GET /google/play/games query params (litescrape.com/docs/google-play-games, 2026-09-20). */
export const zGooglePlayGamesQueryParams = z.object({
    ...playListingShape,
    games_category: zPlayCategory.describe(
        "Native category identifier, such as 'GAME_PUZZLE'. Cannot be combined with q or an explicit store_device.",
    ).optional(),
    store_device: z.enum([
        "phone",
        "tablet",
        "tv",
        "chromebook",
        "watch",
        "windows",
    ]).describe(
        "Device storefront to browse. Omit for phone; an explicit value cannot be combined with q or a category.",
    ).optional(),
}).strict();
