import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsAmazonProductCompetitorsBody } from "./schema/inputs.ts";

/**
 * Amazon Product Competitors — `POST
 * /v3/dataforseo_labs/amazon/product_competitors/live` (v1
 * `/labs/amazon-product-competitors`). Per-row: $0.012 per request plus
 * $0.00012 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Amazon Product Competitors",
        summary: "Find ASINs competing with a product on shared keywords.",
        description: "Competitor products of an ASIN on Amazon. Returns per " +
            "competitor ASIN the shared keyword count, average position, " +
            "and visibility. Supports filters, sorting, and up to 1000 " +
            "rows. Suited for competitor discovery on Amazon. To see " +
            "which fields filters and order_by accept here, call " +
            "dataforseo#labs/filters (free lookup of filterable fields " +
            "per Labs endpoint). To find the location_code and " +
            "language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/amazon/product_competitors/live/",
        categories: ["amazon"],
    },
    endpoint: "/labs/amazon-product-competitors",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/amazon/product_competitors/live",
    },
    input: {
        schema: {
            body: zLabsAmazonProductCompetitorsBody.extend({
                limit: zLabsAmazonProductCompetitorsBody.shape.limit.unwrap()
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
