import { z } from "zod";
import {
    zCountryLocaleFields,
    zFilters,
    zMentionsTarget,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/ai_optimization/llm_mentions/target_metrics/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zAiMentionsTargetMetricsBody = z.object({
    target: zMentionsTarget,
    ...zCountryLocaleFields,
    platform: z.string().min(1).describe(
        "Target platform (values: chat_gpt, google)",
    ).optional(),
    initial_dataset_filters: zFilters,
    internal_list_limit: z.number().int().min(1).max(10).describe(
        "Maximum number of elements within internal arrays (default 10; max 10)",
    ).optional(),
}).strict();
