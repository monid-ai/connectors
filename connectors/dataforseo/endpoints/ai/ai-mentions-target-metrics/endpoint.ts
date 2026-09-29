import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAiMentionsTargetMetricsBody } from "./schema/inputs.ts";

/**
 * AI Mention Metrics — `POST
 * /v3/ai_optimization/llm_mentions/target_metrics/live` (v1
 * `/ai/mentions-target-metrics`). Per-row: $0.1 per request plus $0.001 per
 * row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "AI Mention Metrics",
        summary: "Get how often a brand, keyword, or domain is mentioned and " +
            "cited in AI answers.",
        description:
            "Aggregated LLM mention metrics for the targets: mention " +
            "count, citation count, distinct prompts, AI search volume, " +
            "share of answers, and the top cited pages. Supports " +
            "platform, location, language, and initial_dataset_filters. " +
            "Suited for AI visibility scorecards. To see which fields " +
            "initial_dataset_filters accepts here, call " +
            "dataforseo#ai/mentions-filters (free lookup of filterable " +
            "fields). To find supported location and language pairs, call " +
            "dataforseo#ai/mentions-locations (free lookup).",
        docsUrl:
            "https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/target_metrics/live/",
        categories: ["geo"],
    },
    endpoint: "/ai/mentions-target-metrics",
    request: {
        method: "POST",
        path: "/v3/ai_optimization/llm_mentions/target_metrics/live",
    },
    input: { schema: { body: zAiMentionsTargetMetricsBody } },
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
        estimate: () => ({ counts: { rows: 1 } }),
    },
});
