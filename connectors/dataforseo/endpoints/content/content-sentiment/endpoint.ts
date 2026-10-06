import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zContentSentimentBody } from "./schema/inputs.ts";

/**
 * Mention Sentiment — `POST /v3/content_analysis/sentiment_analysis/live`
 * (v1 `/content/sentiment`). Per-row: $0.024 per request plus $0.000036 per
 * row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Mention Sentiment",
        summary: "Get sentiment and connotation breakdown of pages citing a " +
            "keyword.",
        description: "Sentiment analysis of a keyword's citations: counts by " +
            "positive, negative, and neutral sentiment and by connotation " +
            "(anger, happiness, love, fear, ...). Supports page_type and " +
            "initial_dataset_filters. Suited for brand-perception " +
            "tracking. To see which fields initial_dataset_filters " +
            "accepts here, call dataforseo#content/filters (free lookup " +
            "of filterable fields).",
        docsUrl:
            "https://docs.dataforseo.com/v3/content_analysis/sentiment_analysis/live/",
        categories: ["news-search"],
    },
    endpoint: "/content/sentiment",
    request: {
        method: "POST",
        path: "/v3/content_analysis/sentiment_analysis/live",
    },
    input: { schema: { body: zContentSentimentBody } },
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
