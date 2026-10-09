import { z } from "zod";
import { zFilters } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/content_analysis/rating_distribution/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zContentRatingDistributionBody = z.object({
    keyword: z.string().min(1).max(200).describe(
        "Keyword, phrase, or brand to find citations of.",
    ),
    keyword_fields: z.record(z.string(), z.any()).describe(
        "Target keyword fields and target keywords",
    ).optional(),
    page_type: z.array(z.string().min(1)).describe(
        "Target page types (values: 'ecommerce', 'news', 'blogs', 'message-boards', 'organization')",
    ).optional(),
    internal_list_limit: z.number().int().min(1).max(20).describe(
        "Maximum number of elements within internal arrays (1-20, default 1)",
    ).optional(),
    search_mode: z.string().min(1).describe(
        "Results grouping type (default as_is)",
    ).optional(),
    positive_connotation_threshold: z.number().min(0).max(1).describe(
        "Positive connotation threshold (0-1, default 0.4)",
    ).optional(),
    sentiments_connotation_threshold: z.number().min(0).max(1).describe(
        "Sentiment connotation threshold (0-1, default 0.4)",
    ).optional(),
    initial_dataset_filters: zFilters,
    rank_scale: z.string().min(1).describe(
        "Defines the scale used for calculating and displaying the rank values (default one_thousand; values: one_hundred)",
    ).optional(),
}).strict();
