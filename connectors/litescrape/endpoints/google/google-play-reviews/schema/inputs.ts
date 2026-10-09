import { z } from "zod";
import {
    zPlayLocale,
    zPlayProductId,
    zPlayStore,
    zPlayToken,
} from "../../../../schema/google-play.ts";

/** GET /google/play/reviews query params (litescrape.com/docs/google-play-reviews, 2026-09-20). */
export const zGooglePlayReviewsQueryParams = z.object({
    product_id: zPlayProductId.describe(
        "Native Google Play product identifier, such as 'com.duolingo'.",
    ),
    store: zPlayStore.describe(
        "Product catalog containing this identifier. Default 'apps'.",
    ).optional(),
    ...zPlayLocale,
    platform: z.enum(["phone", "tablet", "watch", "chromebook", "tv"])
        .describe("Platform the reviews belong to. Default 'phone'.")
        .optional(),
    rating: z.number().int().min(1).max(5).describe(
        "Only reviews with this star rating, 1-5.",
    ).optional(),
    sort_by: z.union([z.literal(1), z.literal(2), z.literal(3)]).describe(
        "1 most relevant, 2 newest, 3 by rating. Default 1.",
    ).optional(),
    num: z.number().int().min(1).max(199).describe(
        "Number of reviews, 1-199. Default 40.",
    ).optional(),
    next_page_token: zPlayToken.describe(
        "Returned review continuation. Keep product, store, language, country, platform, rating, sort order, and count the same.",
    ).optional(),
}).strict();
