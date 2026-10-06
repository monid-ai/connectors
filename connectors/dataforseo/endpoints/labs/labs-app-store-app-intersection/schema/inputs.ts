import { z } from "zod";
import {
    zCountryLocaleFields,
    zFilters,
    zLimit,
    zOffset,
    zOrderBy,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/dataforseo_labs/apple/app_intersection/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zLabsAppStoreAppIntersectionBody = z.object({
    app_ids: z.record(z.string(), z.string().min(1)).describe(
        "Numbered App Store app ids, e.g. {'1': '324684580', '2': '284035177'}; up to 20.",
    ),
    ...zCountryLocaleFields,
    filters: zFilters,
    order_by: zOrderBy,
    limit: zLimit(1000, 100),
    offset: zOffset,
}).strict();
