import { z } from "zod";
import {
    zCountryLocaleFields,
    zMentionsTarget,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/ai_optimization/llm_mentions/timeseries_delta/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zAiMentionsTimeseriesDeltaBody = z.object({
    target: zMentionsTarget,
    date_from: z.iso.date().describe("Start date of the time range"),
    date_to: z.iso.date().describe("End date of the time range"),
    group_range: z.string().min(1).describe(
        "Timeseries delta range (values: day, week, month, year)",
    ),
    ...zCountryLocaleFields,
    platform: z.string().min(1).describe(
        "Target platform (default google; values: chat_gpt, google)",
    ).optional(),
}).strict();
