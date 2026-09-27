import { z } from "zod";

/**
 * Request body of `POST /v3/ai_optimization/claude/llm_responses/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zAiClaudeResponseBody = z.object({
    user_prompt: z.string().min(1).max(4000).describe(
        "The question or instruction sent to the model.",
    ),
    model_name: z.string().min(1).max(80).describe(
        "Model name from /ai/claude-models, e.g. 'claude-sonnet-4-0'; a bare family name picks its latest version.",
    ),
    max_output_tokens: z.number().int().min(1).max(1024).describe(
        "Maximum answer tokens (1-1024, default 1024); caps the LLM token cost.",
    ).optional(),
    temperature: z.number().describe(
        "Randomness of the AI response (default 0; max 1)",
    ).optional(),
    top_p: z.number().describe(
        "Diversity of the AI response (default null; max 1)",
    ).optional(),
    web_search: z.boolean().describe(
        "Enable web search for current information (default false)",
    ).optional(),
    force_web_search: z.boolean().describe(
        "Force AI agent to use web search (default false)",
    ).optional(),
    web_search_country_iso_code: z.string().min(1).describe(
        "ISO country code of the location used for searching the web (values: AR, AT, AU, BE, BR, CA, CH, CL, CN, DE, DK, ES, FI, FR, GB, HK, ID, IN, IT, JP, KR, MX, MY, NL, NO, NZ, PH, PL, PT, RU, SA, SE, TR, TW, US, ZA)",
    ).optional(),
    web_search_city: z.string().min(1).describe(
        "City name of the location used for searching the web",
    ).optional(),
    system_message: z.string().min(1).describe(
        "Instructions for the AI behaviour",
    ).optional(),
    message_chain: z.array(z.record(z.string(), z.any())).describe(
        "Message chain",
    ).optional(),
    use_reasoning: z.boolean().describe(
        "Enable reasoning for the AI model (default false)",
    ).optional(),
}).strict();
