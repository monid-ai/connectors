import { z } from "zod";
import {
    zAppStoreCountry,
    zAppStoreProductId,
} from "../../../../schema/apple.ts";

/** GET /apple/app-store/reviews query params
 *  (litescrape.com/docs/apple-app-store-reviews, 2026-09-20). */
export const zAppleAppStoreReviewsQueryParams = z.object({
    product_id: zAppStoreProductId.describe(
        "Positive decimal Apple app identifier, such as '570060128'.",
    ),
    country: zAppStoreCountry,
    sort: z.enum(["mostrecent", "mosthelpful"]).describe(
        "'mostrecent' or 'mosthelpful'. The Mac storefront always returns newest first. Default 'mostrecent'.",
    ).optional(),
    page: z.number().int().min(1).max(2_147_483_647).describe(
        "One-based page number. Exhausted pages return an empty review list. Default 1.",
    ).optional(),
}).strict();
