import { z } from "zod";
import {
    zFilters,
    zLimit,
    zOffset,
    zOrderBy,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/content_analysis/search/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zContentSearchBody = z.object({
    keyword: z.string().min(1).max(200).describe(
        "Keyword, phrase, or brand to find citations of.",
    ),
    keyword_fields: z.record(z.string(), z.any()).describe(
        "Target keyword fields and target keywords",
    ).optional(),
    page_type: z.array(z.string().min(1)).describe(
        "Target page types (values: 'ecommerce', 'news', 'blogs', 'message-boards', 'organization')",
    ).optional(),
    search_mode: z.string().min(1).describe(
        "Results grouping type (default as_is)",
    ).optional(),
    limit: zLimit(1000, 20),
    filters: zFilters,
    order_by: zOrderBy,
    offset: zOffset,
    offset_token: z.string().min(1).describe(
        "Offset token for subsequent requests",
    ).optional(),
    rank_scale: z.string().min(1).describe(
        "Defines the scale used for calculating and displaying the domain_rank, and url_rank values (default one_thousand; values: one_hundred)",
    ).optional(),
}).strict();
