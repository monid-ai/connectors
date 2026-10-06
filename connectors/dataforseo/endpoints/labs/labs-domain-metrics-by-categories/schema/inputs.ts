import { z } from "zod";
import {
    zCountryLocaleFields,
    zFilters,
    zLimit,
    zOffset,
    zOrderBy,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/dataforseo_labs/google/domain_metrics_by_categories/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zLabsDomainMetricsByCategoriesBody = z.object({
    category_codes: z.array(z.number().int()).min(1).max(5).describe(
        "Category codes from the Labs categories dictionary (1-5).",
    ),
    first_date: z.iso.date().describe("First date of comparison period"),
    second_date: z.iso.date().describe("Second date of comparison period"),
    ...zCountryLocaleFields,
    item_types: z.array(z.string().min(1)).describe(
        "Display results by item type (default ['organic', 'paid']; values: ['organic', 'paid', 'featured_snippet', 'local_pack'])",
    ).optional(),
    top_categories_count: z.number().int().max(5).describe(
        "Number of additional domain categories (max 5)",
    ).optional(),
    include_subdomains: z.boolean().describe(
        "Return subdomains in the API response (default true)",
    ).optional(),
    etv_min: z.number().int().describe(
        "Minimum current organic ETV of the domain",
    ).optional(),
    etv_max: z.number().int().describe(
        "Maximum current organic ETV of the domain",
    ).optional(),
    correlate: z.boolean().describe(
        "Correlate data with previously obtained datasets (default true)",
    ).optional(),
    limit: zLimit(1000, 100),
    offset: zOffset,
    filters: zFilters,
    order_by: zOrderBy,
}).strict();
