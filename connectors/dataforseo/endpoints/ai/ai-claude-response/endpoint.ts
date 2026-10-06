import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zAiClaudeResponseBody } from "./schema/inputs.ts";

/**
 * Ask Claude — `POST /v3/ai_optimization/claude/llm_responses/live` (v1
 * `/ai/claude-response`). Flat: $0.0006 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Ask Claude",
        summary: "Send a prompt to Claude and get the answer with citations " +
            "and token usage.",
        description:
            "Runs a prompt against a Claude model through DataForSEO. " +
            "Returns the answer as message sections with text and " +
            "annotations (cited URLs), the model actually used, input and " +
            "output token counts, and the money spent on tokens. Supports " +
            "system_message, temperature, top_p, max_output_tokens, a " +
            "message_chain for multi-turn context, and web_search with " +
            "country and city targeting where the model supports it. " +
            "Suited for AI-answer monitoring: how a model describes a " +
            "brand, which sources it cites, and how answers vary by " +
            "location. To list the model names this endpoint accepts, " +
            "call dataforseo#ai/claude-models (free lookup).",
        docsUrl:
            "https://docs.dataforseo.com/v3/ai_optimization/claude/llm_responses/live/",
        categories: ["geo"],
        notes: [
            "Plus the LLM's own token cost, settled from the vendor " +
            "receipt; a 1024-token answer stays well under $0.10 on every " +
            "listed model.",
        ],
    },
    endpoint: "/ai/claude-response",
    request: {
        method: "POST",
        path: "/v3/ai_optimization/claude/llm_responses/live",
    },
    input: {
        schema: { body: zAiClaudeResponseBody },
        toRequest: ({ data, utils }) => {
            const body = data.input.body;
            const given = typeof body === "object" && body !== null &&
                    !Array.isArray(body)
                ? body
                : {};
            // the connector's cap goes UNDER the caller's fields (v1
            // liveStart defaults): a smaller max_output_tokens wins
            return {
                ...data.input,
                body: utils.json.merge({ max_output_tokens: 1024 }, given),
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.0006 },
        },
    },
});
