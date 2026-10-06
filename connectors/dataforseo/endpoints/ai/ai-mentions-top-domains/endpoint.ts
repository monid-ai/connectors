import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAiMentionsTopDomainsBody } from "./schema/inputs.ts";

/**
 * Top AI-Cited Domains — `POST
 * /v3/ai_optimization/llm_mentions/top_mentioned_domains/live` (v1
 * `/ai/mentions-top-domains`). Per-row: $0.1 per request plus $0.001 per row
 * returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Top AI-Cited Domains",
        summary: "List the domains AI answers cite most for a topic or brand.",
        description: "Domains most often cited in LLM answers mentioning the " +
            "targets. Returns per domain the citation count, mention " +
            "count, and share. Supports platform, location, language, " +
            "filters, sorting, and up to 1000 rows. Suited for finding " +
            "which sources shape AI answers about a topic. To see which " +
            "fields initial_dataset_filters accepts here, call " +
            "dataforseo#ai/mentions-filters (free lookup of filterable " +
            "fields). To find supported location and language pairs, call " +
            "dataforseo#ai/mentions-locations (free lookup).",
        docsUrl:
            "https://docs.dataforseo.com/v3/ai_optimization/llm_mentions/top_mentioned_domains/live/",
        categories: ["geo"],
    },
    endpoint: "/ai/mentions-top-domains",
    request: {
        method: "POST",
        path: "/v3/ai_optimization/llm_mentions/top_mentioned_domains/live",
    },
    input: {
        schema: {
            body: zAiMentionsTopDomainsBody.extend({
                limit: zAiMentionsTopDomainsBody.shape.limit.unwrap().default(
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
