import { z } from "zod";
import {
    zFilters,
    zLimit,
    zOffset,
    zOrderBy,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/domain_analytics/technologies/aggregation_technologies/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zDomainTechnologiesAggregationBody = z.object({
    group: z.string().min(1).describe(
        "Id of the target technology group",
    ).optional(),
    category: z.string().min(1).describe(
        "Id of the target technology category",
    ).optional(),
    technology: z.string().min(1).describe("Target technology").optional(),
    keyword: z.string().min(1).describe(
        "Target keyword in the domain's meta keywords",
    ).optional(),
    mode: z.string().min(1).describe("Search mode (default as_is)").optional(),
    filters: zFilters,
    order_by: zOrderBy,
    internal_groups_list_limit: z.number().int().min(1).max(10000).describe(
        "Maximum number of returned technology groups (1-10000, default 5)",
    ).optional(),
    internal_categories_list_limit: z.number().int().min(1).max(10000).describe(
        "Maximum number of returned technology categories within the same group (1-10000, default 5)",
    ).optional(),
    internal_technologies_list_limit: z.number().int().min(1).max(10000)
        .describe(
            "Maximum number of returned technologies within the same category (1-10000, default 10)",
        ).optional(),
    internal_list_limit: z.number().int().min(1).max(10000).describe(
        "Maximum number of items with identical 'category', 'group', and 'technology' (1-10000, default 10)",
    ).optional(),
    limit: zLimit(10000, 100),
    offset: zOffset,
}).strict();
