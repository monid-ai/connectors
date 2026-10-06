import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsAmazonProductRankOverviewBody } from "./schema/inputs.ts";

/**
 * Amazon Product Rank Overview — `POST
 * /v3/dataforseo_labs/amazon/product_rank_overview/live` (v1
 * `/labs/amazon-product-rank-overview`). Per-row: $0.012 per request plus
 * $0.00012 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Amazon Product Rank Overview",
        summary: "Get ranking summaries for up to 1000 Amazon ASINs.",
        description:
            "Rank overview for a list of ASINs: per product the count of " +
            "keywords it ranks for and the position distribution for " +
            "organic and sponsored results. Suited for portfolio-level " +
            "Amazon visibility checks. To find the location_code and " +
            "language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/amazon/product_rank_overview/live/",
        categories: ["amazon"],
    },
    endpoint: "/labs/amazon-product-rank-overview",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/amazon/product_rank_overview/live",
    },
    input: { schema: { body: zLabsAmazonProductRankOverviewBody } },
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
        estimate: ({ data }) => ({
            counts: { rows: data.input.body.asins.length },
        }),
    },
});
