import { z } from "zod";
import {
    zFilters,
    zLimit,
    zOffset,
    zOrderBy,
    zTarget,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/backlinks/competitors/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zBacklinksCompetitorsBody = z.object({
    target: zTarget,
    limit: zLimit(1000, 100),
    offset: zOffset,
    filters: zFilters,
    order_by: zOrderBy,
    main_domain: z.boolean().describe(
        "Indicates if only main domain of the target will be included in the search (default true)",
    ).optional(),
    exclude_large_domains: z.boolean().describe(
        "Indicates whether large domain will appear in results (default true)",
    ).optional(),
    exclude_internal_backlinks: z.boolean().describe(
        "Indicates if internal backlinks from subdomains to the target will be excluded from the results (default true)",
    ).optional(),
    rank_scale: z.string().min(1).describe(
        "Defines the scale used for calculating and displaying the rank, domain_from_rank, and page_from_rank values (default one_thousand; values: one_hundred)",
    ).optional(),
}).strict();
