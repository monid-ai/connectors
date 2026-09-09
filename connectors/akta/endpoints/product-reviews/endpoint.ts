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
        /** TWO vendor-priced MODES as mode-selected metered lines (design
         *  D19/D26) — the fn populates only the active mode's key; the
         *  rates live in `consumes`. v1 evidence (verified against akta's
         *  real charges): WITHOUT `products` the call is the product-list
         *  mode at a flat 0.5 credits; WITH `products` each product bills
         *  one whole 50-record increment of 1.5 credits (regardless of
         *  `limit`). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                product: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "products",
                    consumes: { credit: "default", amount: 1.5 },
                },
                list_lookup: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "catalog lookups",
                    consumes: { credit: "default", amount: 0.5 },
                },
            },
        },
        /** Typed read (pre-toRequest validated input — design D25); the
         *  presence check IS the vendor's mode switch. */
        estimate: ({ data }) => {
            const products = data.input.queryParams.products;
            return {
                counts: products !== undefined && products.length > 0
                    ? { "product": products.length }
                    : { "list_lookup": 1 },
            };
        },
        /** Settle counts the REQUESTED quantities (akta bills per product
         *  increment regardless of delivery — v1-verified); the vendor
         *  meter stays in the raw run record. */
        consolidate: ({ data, utils }) => {
            // the ENVELOPE input is post-toRequest (wire shape): the
            // provider CSV-joins arrays, so `products` is "id1,id2" here
            const raw = utils.json.optionalGet(
                data.input.queryParams ?? {},
                "$.products",
            );
            const products = typeof raw === "string" && raw !== ""
                ? raw.split(",").length
                : Array.isArray(raw)
                ? raw.length
                : 0;
            return {
                usage: {
                    counts: products > 0
                        ? { "product": products }
                        : { "list_lookup": 1 },
                },
                output: utils.json.omit(data.output, ["credits_consumed"]),
            };
        },
    },
});
