import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAiMentionsTopBrandCategoriesBody } from "./schema/inputs.ts";

/**
 * Top AI-Mentioned Categories — `POST
 * /v3/ai_optimization/llm_mentions/top_mentioned_brand_categories/live` (v1
 * `/ai/mentions-top-brand-categories`). Per-row: $0.1 per request plus
 * $0.001 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Top AI-Mentioned Categories",
        summary: "List the brand categories AI answers mention most for a " +
            "topic.",
        description:
            "Brand categories most often mentioned in LLM answers about " +
            "the targets. Returns per category the mention count and " +
            "share. Supports platform, location, language, filters, " +
            "sorting, and up to 1000 rows. Suited for mapping which " +
            "product categories AI associates with a topic. To see which " +
            "fields initial_dataset_filters accepts here, call " +
            "dataforseo#ai/mentions-filters (free lookup of filterable " +
            "fields). To find supported location and language pairs, call " +
            "dataforseo#ai/mentions-locations (free lookup).",
        docsUrl:
            "https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/top_mentioned_brand_categories/live/",
        categories: ["geo"],
    },
    endpoint: "/ai/mentions-top-brand-categories",
    request: {
        method: "POST",
        path:
            "/v3/ai_optimization/llm_mentions/top_mentioned_brand_categories/live",
    },
    input: {
        schema: {
            body: zAiMentionsTopBrandCategoriesBody.extend({
                limit: zAiMentionsTopBrandCategoriesBody.shape.limit.unwrap()
                    .default(100),
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
