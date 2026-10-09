import { z } from "zod";
import { zAppStoreCountry } from "../../../../schema/apple.ts";

/** GET /apple/app-store/search query params
 *  (litescrape.com/docs/apple-app-store-search, 2026-09-20). */
export const zAppleAppStoreSearchQueryParams = z.object({
    // the vendor's bound is 2,048 UTF-8 bytes (4,096 URL-encoded); JSON
    // Schema counts characters, so this is the closest gate that compiles
    term: z.string().min(1).max(2048).describe(
        "Search term, 1-2,048 UTF-8 bytes (at most 4,096 bytes URL-encoded).",
    ),
    country: zAppStoreCountry,
    lang: z.string().regex(/^[a-zA-Z]{2,3}-[a-zA-Z]{2}$/).describe(
        "Language-region code, such as 'en-us' or 'fr-fr'. Default 'en-us'.",
    ).optional(),
    num: z.number().int().min(1).max(200).describe(
        "Maximum results after filtering, 1-200. Default 10.",
    ).optional(),
    disallow_explicit: z.boolean().describe(
        "Exclude explicit results.",
    ).optional(),
    property: z.enum(["developer"]).describe(
        "'developer' matches developer names instead of app names, ignoring case.",
    ).optional(),
    category_id: z.number().int().min(1).max(2_147_483_647).describe(
        "Filter results by a native genre identifier.",
    ).optional(),
    device: z.enum(["mobile", "tablet", "desktop"]).describe(
        "'mobile' for iPhone apps, 'tablet' for iPad apps, 'desktop' for Mac apps. Default 'mobile'.",
    ).optional(),
}).strict();
