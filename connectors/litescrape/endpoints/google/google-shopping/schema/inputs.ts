import { z } from "zod";
import {
    zDevice,
    zGoogleLocale,
    zGoogleOrigin,
    zQuery,
} from "../../../../schema/common.ts";

/** GET /google/shopping query params (litescrape.com/docs/google-shopping, 2026-09-20). */
export const zGoogleShoppingQueryParams = z.object({
    q: zQuery.describe(
        "Product query, up to 2,048 characters. Optional when a shoprs token is supplied.",
    ).optional(),
    shoprs: z.string().min(1).max(4096).describe(
        "Refinement token from a previous response's filters. An explicit refinement replaces the one it carries.",
    ).optional(),
    start: z.number().int().min(0).max(1000).describe(
        "Result offset, 0-1,000. Default 0.",
    ).optional(),
    num: z.number().int().min(1).max(100).describe(
        "Number of products to return, 1-100; Google's 40-product pages are consumed for you.",
    ).optional(),
    min_price: z.number().min(0).max(1_000_000_000).describe(
        "Lower price bound. Cannot be combined with the other refinements.",
    ).optional(),
    max_price: z.number().min(0).describe(
        "Upper price bound, at or above min_price. Cannot be combined with the other refinements.",
    ).optional(),
    sort_by: z.enum(["1", "2", "3", "4"]).describe(
        "'1' price low to high, '2' price high to low, '3' rating high to low, '4' relevance. Combines with one refinement.",
    ).optional(),
    on_sale: z.boolean().describe(
        "Only products Google marks as on sale. Cannot be combined with the other refinements.",
    ).optional(),
    free_shipping: z.boolean().describe(
        "Only products with free shipping. Cannot be combined with the other refinements.",
    ).optional(),
    small_business: z.boolean().describe(
        "Only products from small businesses. Cannot be combined with the other refinements.",
    ).optional(),
    ...zGoogleOrigin,
    ...zGoogleLocale,
    device: zDevice.describe(
        "Device layout Google renders. Default 'desktop'.",
    ).optional(),
}).strict();
