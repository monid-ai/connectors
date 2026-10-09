import { z } from "zod";
import { zCountryLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/dataforseo_labs/amazon/product_rank_overview/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zLabsAmazonProductRankOverviewBody = z.object({
    asins: z.array(z.string().min(10).max(10)).min(1).max(1000).describe(
        "Amazon ASINs (1-1000).",
    ),
    ...zCountryLocaleFields,
}).strict();
