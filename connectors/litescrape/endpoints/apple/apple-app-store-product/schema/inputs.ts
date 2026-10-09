import { z } from "zod";
import {
    zAppStoreCountry,
    zAppStoreProductId,
} from "../../../../schema/apple.ts";

/** GET /apple/app-store/product query params
 *  (litescrape.com/docs/apple-app-store-product, 2026-09-20). */
export const zAppleAppStoreProductQueryParams = z.object({
    product_id: zAppStoreProductId.describe(
        "Positive decimal Apple app identifier, such as '570060128'.",
    ),
    country: zAppStoreCountry,
    type: z.enum(["app"]).describe(
        "App product type; only 'app' is supported.",
    ).optional(),
}).strict();
