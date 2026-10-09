import { z } from "zod";

/**
 * `POST /chat/completions` request body — the OpenAI-compatible shape
 * Venice accepts, plus the Venice-only `venice_parameters` block.
 * Optionality only (D25): no defaults here; the binding owns them.
 *
 * Mirrors the subset an agent can drive through a single blocking call.
 * Deliberately NOT mirrored: `stream` / `stream_options` (the engine settles
 * one envelope — a stream would arrive as an unparsed SSE string), and the
 * E2EE fields (`enable_e2ee`, encrypted payload headers), which need
 * client-side key exchange the engine cannot perform.
 */

const zTextPart = z.object({
    type: z.literal("text"),
    text: z.string().describe("Text content."),
});

const zImagePart = z.object({
    type: z.literal("image_url"),
    image_url: z.object({
        url: z.string().describe(
            "Image as an https URL or a `data:image/...;base64,` URI. " +
                "Requires a vision-capable model.",
        ),
    }),
});

const zContent = z.union([
    z.string(),
    z.array(z.union([zTextPart, zImagePart])),
]);

const zToolCall = z.object({
    id: z.string(),
    type: z.literal("function"),
    function: z.object({
        name: z.string(),
        arguments: z.string().describe("JSON-encoded arguments."),
    }),
});

const zMessage = z.union([
    z.object({
        role: z.literal("system"),
        content: zContent.describe("System instructions."),
    }),
    z.object({
        role: z.literal("user"),
        content: zContent.describe("User turn: text or text + images."),
    }),
    z.object({
        role: z.literal("assistant"),
        content: zContent.nullable().optional().describe(
            "A prior assistant turn.",
        ),
        tool_calls: z.array(zToolCall).optional().describe(
            "Tool calls the assistant made on that turn.",
        ),
    }),
    z.object({
        role: z.literal("tool"),
        content: zContent.describe("The tool's result."),
        tool_call_id: z.string().describe("The `id` of the call answered."),
    }),
]);

const zTool = z.object({
    type: z.literal("function"),
    function: z.object({
        name: z.string(),
        description: z.string().optional(),
        parameters: z.record(z.string(), z.unknown()).optional().describe(
            "JSON Schema for the function arguments.",
        ),
    }),
});

export const zVeniceParameters = z.object({
    enable_web_search: z.enum(["auto", "on", "off"]).optional().describe(
        "Ground the answer in a live web search: `on` always searches, " +
            "`auto` lets the model decide, `off` never. Adds a per-search " +
            "charge on top of tokens (included in the reported cost).",
    ),
    enable_web_scraping: z.boolean().optional().describe(
        "Scrape URLs that appear in the user message and include their " +
            "content as context. Adds a per-scrape charge.",
    ),
    enable_web_citations: z.boolean().optional().describe(
        "Ask the model to cite web search results inline as [REF]n[/REF].",
    ),
    enable_x_search: z.boolean().optional().describe(
        "Search X (Twitter) posts — only on models whose capabilities " +
            "list supportsXSearch.",
    ),
    include_venice_system_prompt: z.boolean().optional().describe(
        "Prepend Venice's default system prompt (vendor default true). " +
            "Set false for full control of the system message.",
    ),
    character_slug: z.string().optional().describe(
        "Apply a public Venice character (persona system prompt) by slug.",
    ),
    strip_thinking_response: z.boolean().optional().describe(
        "Remove <think> blocks from reasoning models' output.",
    ),
    disable_thinking: z.boolean().optional().describe(
        "Turn reasoning off on models that support toggling it.",
    ),
});

export const zChatCompletionsBody = z.object({
    model: z.string().min(1).describe(
        "Venice model id, e.g. `venice-uncensored-1-2` (uncensored, " +
            "private), `z-ai-glm-5-3-flash` (fast, cheap, private), " +
            "`kimi-k3` (reasoning), `claude-opus-5-5`. List them with " +
            "GET https://api.venice.ai/api/v1/models?type=text.",
    ),
    messages: z.array(zMessage).min(1).describe(
        "The conversation so far, oldest first.",
    ),
    max_completion_tokens: z.number().int().min(1).optional().describe(
        "Upper bound on generated tokens, reasoning included.",
    ),
    temperature: z.number().min(0).max(2).optional(),
    top_p: z.number().min(0).max(1).optional(),
    frequency_penalty: z.number().min(-2).max(2).optional(),
    presence_penalty: z.number().min(-2).max(2).optional(),
    stop: z.union([z.string(), z.array(z.string()).max(4)]).optional(),
    seed: z.number().int().optional(),
    reasoning_effort: z.enum(["none", "low", "medium", "high", "xhigh", "max"])
        .optional().describe(
            "Reasoning depth on models that support it (per-model subset).",
        ),
    response_format: z.union([
        z.object({ type: z.literal("text") }),
        z.object({ type: z.literal("json_object") }),
        z.object({
            type: z.literal("json_schema"),
            json_schema: z.object({
                name: z.string(),
                schema: z.record(z.string(), z.unknown()),
                strict: z.boolean().optional(),
            }),
        }),
    ]).optional().describe(
        "Structured output: `json_schema` enforces a schema on models " +
            "that list supportsResponseSchema.",
    ),
    tools: z.array(zTool).optional().describe(
        "Functions the model may call (models with supportsFunctionCalling).",
    ),
    tool_choice: z.union([
        z.enum(["none", "auto", "required"]),
        z.object({
            type: z.literal("function"),
            function: z.object({ name: z.string() }),
        }),
    ]).optional(),
    parallel_tool_calls: z.boolean().optional(),
    venice_parameters: zVeniceParameters.optional().describe(
        "Venice-only switches: web search, scraping, citations, " +
            "characters, system prompt and thinking control.",
    ),
});
