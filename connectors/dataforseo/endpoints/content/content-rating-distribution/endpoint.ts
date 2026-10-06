import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zContentRatingDistributionBody } from "./schema/inputs.ts";

/**
 * Mention Rating Distribution — `POST
 * /v3/content_analysis/rating_distribution/live` (v1
 * `/content/rating-distribution`). Flat: $0.024 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Mention Rating Distribution",
        summary: "Get the distribution of review ratings on pages citing a " +
            "keyword.",
        description:
            "Rating distribution across pages citing a keyword: counts " +
            "per rating value with the rating scale. Supports page_type " +
            "and initial_dataset_filters. Suited for aggregate review " +
            "sentiment of a product or brand. To see which fields " +
            "initial_dataset_filters accepts here, call " +
            "dataforseo#content/filters (free lookup of filterable " +
            "fields).",
        docsUrl:
            "https://docs.dataforseo.com/v3/content_analysis/rating_distribution/live/",
        categories: ["news-search"],
    },
    endpoint: "/content/rating-distribution",
    request: {
        method: "POST",
        path: "/v3/content_analysis/rating_distribution/live",
    },
    input: { schema: { body: zContentRatingDistributionBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.024 },
        },
    },
});
