import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zContentSummaryBody } from "./schema/inputs.ts";

/**
 * Mention Summary — `POST /v3/content_analysis/summary/live` (v1
 * `/content/summary`). Per-row: $0.024 per request plus $0.000036 per row
 * returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Mention Summary",
        summary: "Get counts and breakdowns of pages citing a keyword.",
        description:
            "Summary of a keyword's citations: total pages and domains, " +
            "split by page type, country, language, and sentiment, plus " +
            "top domains. Supports page_type and initial_dataset_filters. " +
            "Suited for a quick share-of-voice snapshot. To see which " +
            "fields initial_dataset_filters accepts here, call " +
            "dataforseo#content/filters (free lookup of filterable " +
            "fields).",
        docsUrl:
            "https://docs.dataforseo.com/v3/content_analysis/summary/live/",
        categories: ["news-search"],
    },
    endpoint: "/content/summary",
    request: { method: "POST", path: "/v3/content_analysis/summary/live" },
    input: { schema: { body: zContentSummaryBody } },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                base_fee: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 0.024 },
                    label: "base fee",
                    description: "the per-request fee",
                },
                rows: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.000036 },
                    label: "rows",
                    description: "items returned (result[0].items, or its " +
                        "items_count when the items were not returned)",
                },
            },
        },
        estimate: () => ({ counts: { rows: 1 } }),
    },
});
