import { z } from "zod";
import {
    zCountryLocaleFields,
    zFilters,
    zLimit,
    zMentionsTarget,
    zOffset,
    zOrderBy,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/ai_optimization/llm_mentions/top_mentioned_brands/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zAiMentionsTopBrandsBody = z.object({
    target: zMentionsTarget,
    ...zCountryLocaleFields,
    platform: z.string().min(1).describe(
        "Target platform (values: chat_gpt, google)",
    ).optional(),
    filters: zFilters,
    initial_dataset_filters: zFilters,
    limit: zLimit(1000, 100),
    internal_list_limit: z.number().int().min(1).max(10).describe(
        "Maximum number of elements within internal arrays (default 5; max 10)",
    ).optional(),
    order_by: zOrderBy,
    offset: zOffset,
    include_brands: z.array(z.string().min(1)).describe(
        "Array of brands to include in the response",
    ).optional(),
    exclude_brands: z.array(z.string().min(1)).describe(
        "Array of brands to exclude from the response",
    ).optional(),
}).strict();
