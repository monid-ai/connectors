import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAiMentionsHistoricalBody } from "./schema/inputs.ts";

/**
 * AI Mention History — `POST
 * /v3/ai_optimization/llm_mentions/historical/live` (v1
 * `/ai/mentions-historical`). Per-row: $0.1 per request plus $0.001 per row
 * returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "AI Mention History",
        summary:
            "Get how a brand's AI mentions and citations changed month by " +
            "month.",
        description:
            "Monthly history of LLM mentions for the targets. Returns per " +
            "month the mention count, citation count, AI search volume, " +
            "and share of answers. Supports platform, location, language, " +
            "date_from, and date_to. Suited for AI visibility trend " +
            "charts. To find supported location and language pairs, call " +
            "dataforseo#ai/mentions-locations (free lookup).",
        docsUrl:
            "https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/historical/live/",
        categories: ["geo"],
    },
    endpoint: "/ai/mentions-historical",
    request: {
        method: "POST",
        path: "/v3/ai_optimization/llm_mentions/historical/live",
    },
    input: { schema: { body: zAiMentionsHistoricalBody } },
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
