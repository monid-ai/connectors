import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zAiPerplexityResponseBody } from "./schema/inputs.ts";

/**
 * Ask Perplexity — `POST /v3/ai_optimization/perplexity/llm_responses/live`
 * (v1 `/ai/perplexity-response`). Flat: $0.0006 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Ask Perplexity",
        summary: "Send a prompt to Perplexity and get the answer with " +
            "citations and token usage.",
        description:
            "Runs a prompt against a Perplexity model through DataForSEO. " +
            "Returns the answer as message sections with text and " +
            "annotations (cited URLs), the model actually used, input and " +
            "output token counts, and the money spent on tokens. Supports " +
            "system_message, temperature, top_p, max_output_tokens, a " +
            "message_chain for multi-turn context, and " +
            "web_search_country_iso_code to localize the web search. " +
            "Perplexity Sonar models always search the web. Suited for " +
            "AI-answer monitoring: how a model describes a brand, which " +
            "sources it cites, and how answers vary by location. To list " +
            "the model names this endpoint accepts, call " +
            "dataforseo#ai/perplexity-models (free lookup).",
        docsUrl:
            "https://docs.dataforseo.com/v3/ai_optimization/perplexity/llm_responses/live/",
        categories: ["geo"],
        notes: [
            "Plus the LLM's own token cost, settled from the vendor " +
            "receipt; a 1024-token answer stays well under $0.10 on every " +
            "listed model.",
        ],
    },
    endpoint: "/ai/perplexity-response",
    request: {
        method: "POST",
        path: "/v3/ai_optimization/perplexity/llm_responses/live",
    },
    input: {
        schema: { body: zAiPerplexityResponseBody },
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
