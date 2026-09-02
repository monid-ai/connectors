import { defineEndpoint } from "@shared/core";
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
});
