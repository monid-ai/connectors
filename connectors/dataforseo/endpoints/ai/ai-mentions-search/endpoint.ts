import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAiMentionsSearchBody } from "./schema/inputs.ts";

/**
 * Search AI Mentions — `POST
 * /v3/ai_optimization/llm_mentions/search_mentions/live` (v1
 * `/ai/mentions-search`). Per-row: $0.1 per request plus $0.001 per row
 * returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Search AI Mentions",
        summary: "List AI answers that mention a brand, keyword, or domain, " +
            "with the cited sources.",
        description:
            "Mentions of the targets inside stored LLM conversations " +
            "(ChatGPT, Google AI). Returns per mention the prompt asked, " +
            "the answer excerpt, the model, the position of the mention, " +
            "cited sources with URL and domain, and the AI search volume " +
            "of the prompt. Supports platform, location, language, " +
            "filters, sorting, search_after_token paging, and up to 1000 " +
            "rows. Suited for finding exactly what AI tools say about a " +
            "brand. To see which fields filters and order_by accept here, " +
            "call dataforseo#ai/mentions-filters (free lookup of " +
            "filterable fields). To find supported location and language " +
            "pairs, call dataforseo#ai/mentions-locations (free lookup).",
        docsUrl:
            "https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/search_mentions/live/",
        categories: ["geo"],
    },
    endpoint: "/ai/mentions-search",
    request: {
        method: "POST",
        path: "/v3/ai_optimization/llm_mentions/search_mentions/live",
    },
    input: {
        schema: {
            body: zAiMentionsSearchBody.extend({
                limit: zAiMentionsSearchBody.shape.limit.unwrap().default(100),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                base_fee: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 0.1 },
                    label: "base fee",
                    description: "the per-request fee",
                },
                rows: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.001 },
                    label: "rows",
                    description: "items returned (result[0].items, or its " +
                        "items_count when the items were not returned)",
                },
            },
        },
        estimate: ({ data }) => ({ counts: { rows: data.input.body.limit } }),
    },
});
