import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAiMentionsTopPagesBody } from "./schema/inputs.ts";

/**
 * Top AI-Cited Pages — `POST
 * /v3/ai_optimization/llm_mentions/top_mentioned_pages/live` (v1
 * `/ai/mentions-top-pages`). Per-row: $0.1 per request plus $0.001 per row
 * returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Top AI-Cited Pages",
        summary: "List the pages AI answers cite most for a topic or brand.",
        description: "Pages most often cited in LLM answers mentioning the " +
            "targets. Returns per page the URL, domain, title, citation " +
            "count, and share. Supports platform, location, language, " +
            "filters, sorting, and up to 1000 rows. Suited for " +
            "identifying the content AI tools draw on. To see which " +
            "fields initial_dataset_filters accepts here, call " +
            "dataforseo#ai/mentions-filters (free lookup of filterable " +
            "fields). To find supported location and language pairs, call " +
            "dataforseo#ai/mentions-locations (free lookup).",
        docsUrl:
            "https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/top_mentioned_pages/live/",
        categories: ["geo"],
    },
    endpoint: "/ai/mentions-top-pages",
    request: {
        method: "POST",
        path: "/v3/ai_optimization/llm_mentions/top_mentioned_pages/live",
    },
    input: {
        schema: {
            body: zAiMentionsTopPagesBody.extend({
                limit: zAiMentionsTopPagesBody.shape.limit.unwrap().default(
                    100,
                ),
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
