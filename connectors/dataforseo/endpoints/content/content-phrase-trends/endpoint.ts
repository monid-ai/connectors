import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zContentPhraseTrendsBody } from "./schema/inputs.ts";

/**
 * Mention Trends — `POST /v3/content_analysis/phrase_trends/live` (v1
 * `/content/phrase-trends`). Per-row: $0.024 per request plus $0.000036 per
 * row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Mention Trends",
        summary:
            "Get how often a keyword was cited over time, grouped by day, " +
            "week, or month.",
        description:
            "Citation counts of a keyword over a date range. Returns per " +
            "period the number of citing pages and the sentiment split. " +
            "Supports date_from, date_to, date_group (day, week, month), " +
            "page_type, and initial_dataset_filters. Suited for " +
            "mention-volume trend charts. To see which fields " +
            "initial_dataset_filters accepts here, call " +
            "dataforseo#content/filters (free lookup of filterable " +
            "fields).",
        docsUrl:
            "https://docs.dataforseo.com/v3/content_analysis/phrase_trends/live/",
        categories: ["news-search"],
    },
    endpoint: "/content/phrase-trends",
    request: {
        method: "POST",
        path: "/v3/content_analysis/phrase_trends/live",
    },
    input: { schema: { body: zContentPhraseTrendsBody } },
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
