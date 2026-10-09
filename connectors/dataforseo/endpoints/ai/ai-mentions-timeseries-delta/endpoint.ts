import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAiMentionsTimeseriesDeltaBody } from "./schema/inputs.ts";

/**
 * AI Mention Changes — `POST
 * /v3/ai_optimization/llm_mentions/timeseries_delta/live` (v1
 * `/ai/mentions-timeseries-delta`). Per-row: $0.1 per request plus $0.001
 * per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "AI Mention Changes",
        summary: "Get period-over-period changes in AI mentions for a brand.",
        description: "Change in LLM mention metrics for the targets between " +
            "periods in a date range. Returns per period the mention and " +
            "citation counts and their deltas. Supports platform, " +
            "location, language, date_from, date_to, and group_range " +
            "(day, week, month). Suited for spotting AI visibility " +
            "shifts. To find supported location and language pairs, call " +
            "dataforseo#ai/mentions-locations (free lookup).",
        docsUrl:
            "https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/timeseries_delta/live/",
        categories: ["geo"],
    },
    endpoint: "/ai/mentions-timeseries-delta",
    request: {
        method: "POST",
        path: "/v3/ai_optimization/llm_mentions/timeseries_delta/live",
    },
    input: { schema: { body: zAiMentionsTimeseriesDeltaBody } },
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
