import { z } from "zod";
import {
    zCountryLocaleFields,
    zFilters,
    zLimit,
    zOffset,
    zOrderBy,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/dataforseo_labs/google/top_searches/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zLabsTopSearchesBody = z.object({
    ...zCountryLocaleFields,
    include_serp_info: z.boolean().describe(
        "Include data from SERP for each keyword (default false)",
    ).optional(),
    include_clickstream_data: z.boolean().describe(
        "Include or exclude data from clickstream-based metrics in the result (default false)",
    ).optional(),
    ignore_synonyms: z.boolean().describe(
        "Ignore highly similar keywords (default false)",
    ).optional(),
    filters: zFilters,
    order_by: zOrderBy,
    limit: zLimit(1000, 100),
    offset: zOffset,
    offset_token: z.string().min(1).describe(
        "Offset token for subsequent requests",
    ).optional(),
}).strict();
