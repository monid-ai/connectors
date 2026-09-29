import { z } from "zod";
import {
    zCountryLocaleFields,
    zFilters,
    zLimit,
    zOffset,
    zOrderBy,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/dataforseo_labs/google/page_intersection/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zLabsPageIntersectionBody = z.object({
    pages: z.record(z.string(), z.string().min(1)).describe(
        "Numbered targets, e.g. {'1': 'example.com', '2': 'other.com/page'}; up to 20.",
    ),
    exclude_pages: z.array(z.string().min(1)).max(10).describe(
        "URLs of pages you want to exclude",
    ).optional(),
    ...zCountryLocaleFields,
    item_types: z.array(z.string().min(1)).describe(
        "Search results type (default ['organic', 'paid']; values: ['organic', 'paid', 'featured_snippet', 'local_pack'])",
    ).optional(),
    limit: zLimit(1000, 100),
    offset: zOffset,
    include_subdomains: z.boolean().describe(
        "Indicates if the subdomains will be included in the search (default true)",
    ).optional(),
    intersection_mode: z.string().min(1).describe(
        "Indicates whether to intersect keywords (values: union, intersect union)",
    ).optional(),
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
}).strict();
