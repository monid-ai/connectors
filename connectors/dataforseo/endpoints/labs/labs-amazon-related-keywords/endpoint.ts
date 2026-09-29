import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsAmazonRelatedKeywordsBody } from "./schema/inputs.ts";

/**
 * Amazon Related Keywords — `POST
 * /v3/dataforseo_labs/amazon/related_keywords/live` (v1
 * `/labs/amazon-related-keywords`). Per-row: $0.012 per request plus
 * $0.00012 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Amazon Related Keywords",
        summary: "Get Amazon keywords related to a seed, with search volume.",
        description:
            "Keywords related to a seed keyword on Amazon, walked through " +
            "Amazon's suggestions. Returns per keyword the Amazon search " +
            "volume and the depth it was found at. Supports depth, " +
            "ignore_synonyms, and up to 1000 rows via limit and offset. " +
            "Suited for Amazon listing keyword expansion. To find the " +
            "location_code and language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/amazon/related_keywords/live/",
        categories: ["amazon"],
    },
    endpoint: "/labs/amazon-related-keywords",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/amazon/related_keywords/live",
    },
    input: {
        schema: {
            body: zLabsAmazonRelatedKeywordsBody.extend({
                limit: zLabsAmazonRelatedKeywordsBody.shape.limit.unwrap()
                    .default(100),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                base_fee: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 0.012 },
                    label: "base fee",
                    description: "the per-request fee",
                },
                rows: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.00012 },
                    label: "rows",
                    description: "items returned (result[0].items, or its " +
                        "items_count when the items were not returned)",
                },
            },
        },
        estimate: ({ data }) => ({ counts: { rows: data.input.body.limit } }),
    },
});
