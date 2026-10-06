import { z } from "zod";
import {
    zFilters,
    zLimit,
    zOffset,
    zOrderBy,
    zTarget,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/backlinks/backlinks/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zBacklinksBacklinksBody = z.object({
    target: zTarget,
    mode: z.string().min(1).describe(
        "Results grouping type (default as_is)",
    ).optional(),
    custom_mode: z.record(z.string(), z.any()).describe(
        "Detailed results grouping type",
    ).optional(),
    filters: zFilters,
    order_by: zOrderBy,
    offset: zOffset,
    search_after_token: z.string().min(1).describe(
        "Token for subsequent requests",
    ).optional(),
    limit: zLimit(1000, 100),
    backlinks_status_type: z.string().min(1).describe(
        "Set what backlinks to return and count (default live; values: all)",
    ).optional(),
    include_subdomains: z.boolean().describe(
        "Indicates if the subdomains of the target will be included in the search (default true)",
    ).optional(),
    exclude_internal_backlinks: z.boolean().describe(
        "Indicates if internal backlinks from subdomains to the target will be excluded from the results (default true)",
    ).optional(),
    rank_scale: z.string().min(1).describe(
        "Defines the scale used for calculating and displaying the rank, domain_from_rank, and page_from_rank values (default one_thousand; values: one_hundred)",
    ).optional(),
}).strict();
