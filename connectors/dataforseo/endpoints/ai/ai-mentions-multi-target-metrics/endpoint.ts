import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAiMentionsMultiTargetMetricsBody } from "./schema/inputs.ts";

/**
 * Compare AI Mentions — `POST
 * /v3/ai_optimization/llm_mentions/multi_target_metrics/live` (v1
 * `/ai/mentions-multi-target-metrics`). Per-row: $0.1 per request plus
 * $0.001 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Compare AI Mentions",
        summary: "Compare AI mention metrics across several brands or domains.",
        description:
            "LLM mention metrics for several target groups side by side: " +
            "per group the mention and citation counts, AI search volume, " +
            "and share of answers. Supports platform, location, language, " +
            "filters, sorting, and up to 1000 rows. Suited for " +
            "brand-vs-competitor AI visibility comparisons. To see which " +
            "fields initial_dataset_filters accepts here, call " +
            "dataforseo#ai/mentions-filters (free lookup of filterable " +
            "fields). To find supported location and language pairs, call " +
            "dataforseo#ai/mentions-locations (free lookup).",
        docsUrl:
            "https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/multi_target_metrics/live/",
        categories: ["geo"],
    },
    endpoint: "/ai/mentions-multi-target-metrics",
    request: {
        method: "POST",
        path: "/v3/ai_optimization/llm_mentions/multi_target_metrics/live",
    },
    input: {
        schema: {
            body: zAiMentionsMultiTargetMetricsBody.extend({
                limit: zAiMentionsMultiTargetMetricsBody.shape.limit.unwrap()
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
