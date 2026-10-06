import { z } from "zod";
import { zFilters } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/content_analysis/category_trends/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zContentCategoryTrendsBody = z.object({
    category_code: z.number().int().describe("Target category code"),
    page_type: z.array(z.string().min(1)).describe(
        "Target page types (values: 'ecommerce', 'news', 'blogs', 'message-boards', 'organization')",
    ).optional(),
    search_mode: z.string().min(1).describe(
        "Results grouping type (default as_is)",
    ).optional(),
    internal_list_limit: z.number().int().min(1).max(20).describe(
        "Maximum number of elements within internal arrays (1-20, default 1)",
    ).optional(),
    date_from: z.iso.date().describe("Starting date of the time range"),
    date_to: z.iso.date().describe(
        "Ending date of the time range",
    ).optional(),
    date_group: z.string().min(1).describe(
        "Time range which will be used to group the results (default month; values: day, week, month)",
    ).optional(),
    initial_dataset_filters: zFilters,
    rank_scale: z.string().min(1).describe(
        "Defines the scale used for calculating and displaying the rank values (default one_thousand; values: one_hundred)",
    ).optional(),
}).strict();
