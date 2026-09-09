import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zProductReviewsQueryParams } from "./schema/inputs.ts";

/** GET /v1/company/product-reviews — catalog + per-product reviews. */
export default defineEndpoint({
    meta: {
        displayName: "Akta Product Reviews",
        summary: "A company's product catalog and per-product reviews.",
        description: "Fetch a company's product catalog and, optionally, " +
            "detailed reviews per product — ratings, star distribution, " +
            "pros, cons, pricing, and structured individual review content " +
            "sourced from G2 and other providers. Call WITHOUT 'products' " +
            "to get the product list (and its product_id values); call " +
            "WITH 'products' to fetch reviews for specific products.",
        docsUrl:
            "https://docs.akta.pro/api-reference/alternative-data/product-reviews",
        categories: ["company-reviews"],
    },
    request: { method: "GET", path: "/v1/company/product-reviews/" },
    input: { schema: { queryParams: zProductReviewsQueryParams } },
    usage: {
        /** The provider's model, restated so the estimate's counts key
         *  narrows to the doc's own literal metered key (design D23/D24 —
         *  consolidate stays provider-level). */
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.CREDIT },
        /** TWO vendor-priced MODES, both deduced from v1
         *  product-reviews.ts (verified against akta's real charges):
         *  WITHOUT `products` the call is the product-list mode at a flat
         *  0.5 credits ("Akta charges 0.5 credits ($0.025) when called
         *  without `products`"); WITH `products` each product bills one
         *  whole 50-record increment of 1.5 credits ("1.5 credits per 50
         *  records … per product", regardless of `limit`). The presence
         *  check selects between the two deduced rates — it is the
         *  vendor's mode switch, not a fallback constant (optionalLen
         *  still throws on a present non-array). Settle trues up on
         *  `credits_consumed`. */
        estimate: ({ data, utils }) => {
            const products = utils.json.optionalLen(
                data.input.queryParams ?? {},
                "$.products",
            );
            return {
                counts: {
                    "CREDIT": products !== undefined && products > 0
                        ? products * 1.5
                        : 0.5,
                },
            };
        },
    },
});
