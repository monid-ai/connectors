import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAiKeywordSearchVolumeBody } from "./schema/inputs.ts";

/**
 * AI Search Volume — `POST
 * /v3/ai_optimization/ai_keyword_data/keywords_search_volume/live` (v1
 * `/ai/keyword-search-volume`). Per-row: $0.01 per request plus $0.0001 per
 * row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "AI Search Volume",
        summary: "Estimate how often keywords are asked in AI tools, with a " +
            "12-month trend.",
        description:
            "AI search volume for up to 1000 keywords in a location and " +
            "language. Returns per keyword the estimated monthly AI-tool " +
            "usage and a 12-month trend, derived from People Also Ask " +
            "statistics. Suited for prioritising content for AI search. " +
            "To find supported location and language pairs, call " +
            "dataforseo#ai/keyword-locations (free lookup).",
        docsUrl:
            "https://docs.dataforseo.com/v3/ai_optimization/ai_keyword_data/keywords_search_volume/live/",
        categories: ["geo"],
    },
    endpoint: "/ai/keyword-search-volume",
    request: {
        method: "POST",
        path: "/v3/ai_optimization/ai_keyword_data/keywords_search_volume/live",
    },
    input: { schema: { body: zAiKeywordSearchVolumeBody } },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                base_fee: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 0.01 },
                    label: "base fee",
                    description: "the per-request fee",
                },
                rows: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.0001 },
                    label: "rows",
                    description: "items returned (result[0].items, or its " +
                        "items_count when the items were not returned)",
                },
            },
        },
        estimate: ({ data }) => ({
            counts: { rows: data.input.body.keywords.length },
        }),
    },
});
