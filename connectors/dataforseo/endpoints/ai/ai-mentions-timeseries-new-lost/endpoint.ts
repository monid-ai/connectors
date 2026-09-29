import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAiMentionsTimeseriesNewLostBody } from "./schema/inputs.ts";

/**
 * New Lost AI Mentions — `POST
 * /v3/ai_optimization/llm_mentions/timeseries_new_lost/live` (v1
 * `/ai/mentions-timeseries-new-lost`). Per-row: $0.1 per request plus $0.001
 * per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "New Lost AI Mentions",
        summary:
            "Get new and lost AI mentions and citations for a brand over " +
            "time.",
        description:
            "New and lost LLM mentions and citations for the targets per " +
            "period in a date range. Supports platform, location, " +
            "language, date_from, date_to, and group_range (day, week, " +
            "month). Suited for monitoring where a brand appears or " +
            "disappears in AI answers. To find supported location and " +
            "language pairs, call dataforseo#ai/mentions-locations (free " +
            "lookup).",
        docsUrl:
            "https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/timeseries_new_lost/live/",
        categories: ["geo"],
    },
    endpoint: "/ai/mentions-timeseries-new-lost",
    request: {
        method: "POST",
        path: "/v3/ai_optimization/llm_mentions/timeseries_new_lost/live",
    },
    input: { schema: { body: zAiMentionsTimeseriesNewLostBody } },
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
