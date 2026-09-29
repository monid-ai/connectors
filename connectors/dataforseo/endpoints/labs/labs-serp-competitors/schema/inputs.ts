import { z } from "zod";
import {
    zCountryLocaleFields,
    zFilters,
    zKeywords,
    zLimit,
    zOffset,
    zOrderBy,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/dataforseo_labs/google/serp_competitors/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zLabsSerpCompetitorsBody = z.object({
    keywords: zKeywords(200),
    ...zCountryLocaleFields,
    include_subdomains: z.boolean().describe(
        "Indicates if the subdomains will be included in the search (default true)",
    ).optional(),
    item_types: z.array(z.string().min(1)).describe(
        "Search results type (default ['organic', 'paid']; values: ['organic', 'paid', 'featured_snippet', 'local_pack'])",
    ).optional(),
    limit: zLimit(1000, 100),
    offset: zOffset,
    filters: zFilters,
    order_by: zOrderBy,
}).strict();
