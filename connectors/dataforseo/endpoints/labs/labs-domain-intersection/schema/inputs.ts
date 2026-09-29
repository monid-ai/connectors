import { z } from "zod";
import {
    zCountryLocaleFields,
    zFilters,
    zLimit,
    zOffset,
    zOrderBy,
    zTarget,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/dataforseo_labs/google/domain_intersection/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zLabsDomainIntersectionBody = z.object({
    target1: zTarget,
    target2: zTarget,
    ...zCountryLocaleFields,
    intersections: z.boolean().describe(
        "Domain intersections in SERP (default true)",
    ).optional(),
    item_types: z.array(z.string().min(1)).describe(
        "Search results type (default ['organic', 'paid']; values: ['organic', 'paid', 'featured_snippet', 'local_pack'])",
    ).optional(),
    include_serp_info: z.boolean().describe(
        "Include data from SERP for each keyword (default false)",
    ).optional(),
    include_clickstream_data: z.boolean().describe(
        "Include or exclude data from clickstream-based metrics in the result (default false)",
    ).optional(),
    limit: zLimit(1000, 100),
    offset: zOffset,
    filters: zFilters,
    order_by: zOrderBy,
}).strict();
