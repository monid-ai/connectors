import { z } from "zod";
import {
    zDevice,
    zGoogleLocale,
    zGoogleOrigin,
    zQuery,
} from "../../../../schema/common.ts";

/** A Google Shopping document id: 1 to 20 decimal digits, quoted. */
const zDocId = z.string().regex(/^\d{1,20}$/);

/** GET /google/shopping/product query params
 *  (litescrape.com/docs/google-shopping-product, 2026-09-20). */
export const zGoogleShoppingProductQueryParams = z.object({
    q: zQuery.describe("The search term this product was found with."),
    gpcid: zDocId.describe(
        "Product cluster ID from a shopping result. Required unless prds is supplied.",
    ).optional(),
    headline_offer_docid: zDocId.describe(
        "Headline merchant offer ID from the same shopping result. Use with gpcid.",
    ).optional(),
    image_docid: zDocId.describe(
        "Image document ID from the same shopping result. Use with gpcid.",
    ).optional(),
    prds: z.string().min(1).max(2048).describe(
        "Product selector token from a previous response. Cannot be combined with gpcid and its companion ids.",
    ).optional(),
    ...zGoogleOrigin,
    ...zGoogleLocale,
    device: zDevice.describe(
        "Device layout Google renders. Default 'desktop'.",
    ).optional(),
}).strict();
