import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsAmazonRankedKeywordsBody } from "./schema/inputs.ts";

/**
 * Amazon Ranked Keywords — `POST
 * /v3/dataforseo_labs/amazon/ranked_keywords/live` (v1
 * `/labs/amazon-ranked-keywords`). Per-row: $0.012 per request plus $0.00012
 * per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Amazon Ranked Keywords",
        summary: "List keywords an Amazon product (ASIN) ranks for, with " +
            "positions.",
        description:
            "Keywords an ASIN ranks for in Amazon search. Returns per " +
            "keyword the rank, result type (organic, sponsored), Amazon " +
            "search volume, and product snippet. Supports filters, " +
            "sorting, and up to 1000 rows. Suited for ASIN visibility " +
            "audits. To see which fields filters and order_by accept " +
            "here, call dataforseo#labs/filters (free lookup of " +
            "filterable fields per Labs endpoint). To find the " +
            "location_code and language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/amazon/ranked_keywords/live/",
        categories: ["amazon"],
    },
    endpoint: "/labs/amazon-ranked-keywords",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/amazon/ranked_keywords/live",
    },
    input: {
        schema: {
            body: zLabsAmazonRankedKeywordsBody.extend({
                limit: zLabsAmazonRankedKeywordsBody.shape.limit.unwrap()
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
