import { z } from "zod";
import {
    zCountryLocaleFields,
    zFilters,
    zLimit,
    zMentionsTarget,
    zOrderBy,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/ai_optimization/llm_mentions/multi_target_metrics/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zAiMentionsMultiTargetMetricsBody = z.object({
    targets: z.array(
        z.object({
            key: z.string().min(1).max(250).describe(
                "Label of the target set; groups its results for comparison.",
            ),
            target: zMentionsTarget,
        }).strict(),
    ).min(2).max(10).describe("Target sets to compare, 2-10."),
    ...zCountryLocaleFields,
    platform: z.string().min(1).describe(
        "Target platform (default google; values: chat_gpt, google)",
    ).optional(),
    filters: zFilters,
    initial_dataset_filters: zFilters,
    order_by: zOrderBy,
    limit: zLimit(1000, 100),
    offset: z.number().int().describe(
        "Offset in the results array of the returned mentions data (default 0)",
    ).optional(),
    internal_list_limit: z.number().int().min(1).max(10).describe(
        "Maximum number of elements within internal arrays (default 5; max 10)",
    ).optional(),
}).strict();
