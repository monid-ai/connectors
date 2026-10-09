import { z } from "zod";
import { zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/merchant/amazon/sellers/live/advanced` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zAmazonSellersBody = z.object({
    asin: z.string().min(10).max(10).describe(
        "Amazon product ASIN, e.g. 'B08G4KG9GD'.",
    ),
    ...zLocaleFields,
    se_domain: z.string().min(1).describe(
        "Search engine domain (e.g. amazon.co.uk)",
    ).optional(),
}).strict();
