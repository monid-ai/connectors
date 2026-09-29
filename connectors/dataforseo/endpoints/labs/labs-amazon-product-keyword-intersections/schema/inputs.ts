import { z } from "zod";
import {
    zCountryLocaleFields,
    zFilters,
    zLimit,
    zOffset,
    zOrderBy,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/dataforseo_labs/amazon/product_keyword_intersections/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zLabsAmazonProductKeywordIntersectionsBody = z.object({
    asins: z.record(z.string(), z.string().min(10).max(10)).describe(
        "Numbered ASINs, e.g. {'1': 'B08G4KG9GD', '2': 'B07XJ8C8F5'}; up to 20.",
    ),
    ...zCountryLocaleFields,
    limit: zLimit(1000, 100),
    intersection_mode: z.string().min(1).describe(
        "Mode for finding asin intersections (default intersect; values: union, intersect)",
    ).optional(),
    filters: zFilters,
    order_by: zOrderBy,
    offset: zOffset,
}).strict();
