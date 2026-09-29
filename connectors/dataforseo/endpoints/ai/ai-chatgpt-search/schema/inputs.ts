import { z } from "zod";
import { zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/ai_optimization/chat_gpt/llm_scraper/live/advanced` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zAiChatgptSearchBody = z.object({
    keyword: z.string().min(1).describe("Keyword"),
    ...zLocaleFields,
    force_web_search: z.boolean().describe(
        "Force AI agent to use web search (default false)",
    ).optional(),
}).strict();
