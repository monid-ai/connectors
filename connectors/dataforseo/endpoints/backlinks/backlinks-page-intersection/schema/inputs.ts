import { z } from "zod";
import {
    zFilters,
    zLimit,
    zOffset,
    zOrderBy,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/backlinks/page_intersection/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zBacklinksPageIntersectionBody = z.object({
    targets: z.record(z.string(), z.string().min(1)).describe(
        "Numbered targets, e.g. {'1': 'example.com', '2': 'other.com'}; up to 20.",
    ),
    exclude_targets: z.array(z.string().min(1)).max(10).describe(
        "Domains, subdomains or webpages to exclude (up to 10)",
    ).optional(),
    backlinks_status_type: z.string().min(1).describe(
        "Set what backlinks to return and count (default live; values: all)",
    ).optional(),
    filters: zFilters,
    order_by: zOrderBy,
    offset: zOffset,
    limit: zLimit(1000, 100),
    internal_list_limit: z.number().int().min(1).max(1000).describe(
        "Maximum number of elements within internal arrays (1-1000, default 10)",
    ).optional(),
    include_subdomains: z.boolean().describe(
        "Indicates if the subdomains of the targets will be included in the search (default true)",
    ).optional(),
    include_indirect_links: z.boolean().describe(
        "Indicates if indirect links to the targets will be included in the results (default true)",
    ).optional(),
    exclude_internal_backlinks: z.boolean().describe(
        "Indicates if internal backlinks from subdomains to the target will be excluded from the results (default true)",
    ).optional(),
    intersection_mode: z.string().min(1).describe(
        "Indicates whether to intersect backlinks (default all; values: all, partial all)",
    ).optional(),
    rank_scale: z.string().min(1).describe(
        "Defines the scale used for calculating and displaying the rank, domain_from_rank, and page_from_rank values (default one_thousand; values: one_hundred)",
    ).optional(),
}).strict();
