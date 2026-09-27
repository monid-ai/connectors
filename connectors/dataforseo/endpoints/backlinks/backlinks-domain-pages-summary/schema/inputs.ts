import { z } from "zod";
import {
    zFilters,
    zLimit,
    zOffset,
    zOrderBy,
    zTarget,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/backlinks/domain_pages_summary/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zBacklinksDomainPagesSummaryBody = z.object({
    target: zTarget,
    limit: zLimit(1000, 100),
    offset: zOffset,
    internal_list_limit: z.number().int().min(1).max(1000).describe(
        "Maximum number of elements within internal arrays (1-1000, default 10)",
    ).optional(),
    backlinks_status_type: z.string().min(1).describe(
        "Set what backlinks to return and count (default live; values: all)",
    ).optional(),
    filters: zFilters,
    order_by: zOrderBy,
    backlinks_filters: zFilters,
    include_subdomains: z.boolean().describe(
        "Indicates if the subdomains of the target domain will be included in the search (default true)",
    ).optional(),
    include_indirect_links: z.boolean().describe(
        "Indicates if indirect links to the target will be included in the results (default true)",
    ).optional(),
    exclude_internal_backlinks: z.boolean().describe(
        "Indicates whether the backlinks from subdomains of the target are excluded (default true)",
    ).optional(),
    rank_scale: z.string().min(1).describe(
        "Defines the scale used for calculating and displaying the rank, domain_from_rank, and page_from_rank values (default one_thousand; values: one_hundred)",
    ).optional(),
}).strict();
