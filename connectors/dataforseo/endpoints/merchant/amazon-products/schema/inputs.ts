import { z } from "zod";
import { zDepth, zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/merchant/amazon/products/live/advanced` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zAmazonProductsBody = z.object({
    keyword: z.string().min(1).describe("Keyword"),
    url: z.string().min(1).describe(
        "Direct URL of the search query",
    ).optional(),
    ...zLocaleFields,
    se_domain: z.string().min(1).describe(
        "Search engine domain (e.g. amazon.com)",
    ).optional(),
    depth: zDepth(700, 100, 100),
    max_crawl_pages: z.number().int().min(1).max(7).describe(
        "Page crawl limit (max 7)",
    ).optional(),
    department: z.string().min(1).describe(
        "Amazon product department",
    ).optional(),
    search_param: z.string().min(1).describe(
        "Additional parameters of the search query",
    ).optional(),
    price_min: z.number().int().describe(
        "Minimum product price (e.g. 5)",
    ).optional(),
    price_max: z.number().int().describe(
        "Maximum product price (e.g. 100)",
    ).optional(),
    sort_by: z.string().min(1).describe("Results sorting rules").optional(),
}).strict();
