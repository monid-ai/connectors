import { z } from "zod";

/**
 * Request body of `POST /v3/ai_optimization/gemini/llm_responses/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zAiGeminiResponseBody = z.object({
    user_prompt: z.string().min(1).max(4000).describe(
        "The question or instruction sent to the model.",
    ),
    model_name: z.string().min(1).max(80).describe(
        "Model name from /ai/gemini-models, e.g. 'gemini-2.5-flash'; a bare family name picks its latest version.",
    ),
    max_output_tokens: z.number().int().min(1).max(1024).describe(
        "Maximum answer tokens (1-1024, default 1024); caps the LLM token cost.",
    ).optional(),
    temperature: z.number().describe(
        "Randomness of the AI response (default 1; max 2)",
    ).optional(),
    top_p: z.number().describe(
        "Diversity of the AI response (default 0; max 1)",
    ).optional(),
    web_search: z.boolean().describe(
        "Enable web search for current information (default false)",
    ).optional(),
    system_message: z.string().min(1).describe(
        "Instructions for the AI behavior",
    ).optional(),
    message_chain: z.array(z.record(z.string(), z.any())).describe(
        "Message chain",
    ).optional(),
    use_reasoning: z.boolean().describe(
        "Enable reasoning for the AI model (default false)",
    ).optional(),
}).strict();
