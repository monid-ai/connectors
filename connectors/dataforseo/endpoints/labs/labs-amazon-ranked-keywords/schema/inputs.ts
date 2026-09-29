import { z } from "zod";
import {
    zCountryLocaleFields,
    zFilters,
    zLimit,
    zOffset,
    zOrderBy,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/dataforseo_labs/amazon/ranked_keywords/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zLabsAmazonRankedKeywordsBody = z.object({
    asin: z.string().min(10).max(10).describe(
        "Amazon product ASIN, e.g. 'B08G4KG9GD'.",
    ),
    ...zCountryLocaleFields,
    limit: zLimit(1000, 100),
    ignore_synonyms: z.boolean().describe(
        "Ignore highly similar keywords (default false)",
    ).optional(),
    filters: zFilters,
    order_by: zOrderBy,
    offset: zOffset,
}).strict();
