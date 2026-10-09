import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAmazonProductsBody } from "./schema/inputs.ts";

/**
 * Amazon Product Search — `POST /v3/merchant/amazon/products/live/advanced`
 * (v1 `/amazon/products`). Page-billed: $0.0033 per page of 100 results; the
 * hold and the count are the results asked for, the vendor's default when
 * omitted (design D4 / D5).
 */
export default defineEndpoint({
    meta: {
        displayName: "Amazon Product Search",
        summary: "Search Amazon and get ranked products with price, rating, " +
            "and badges.",
        description: "Amazon search results for a keyword in a marketplace " +
            "location. Returns products with rank, ASIN, title, price and " +
            "currency, rating and review count, Prime and sponsored " +
            "flags, best-seller and Amazon's-choice badges, image, and " +
            "delivery info, plus related searches. Supports depth (up to " +
            "700, 100 per page), department, search_param, price range, " +
            "and sort_by. Suited for price monitoring and share-of-shelf " +
            "checks. To find the location_code or exact location_name for " +
            "an Amazon marketplace, call dataforseo#amazon/locations " +
            "(free lookup, country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/merchant/amazon/products/live/advanced/",
        categories: ["amazon"],
        notes: [
            "Billed per page of 100 results; each further page adds the " +
            "same price.",
        ],
    },
    endpoint: "/amazon/products",
    request: {
        method: "POST",
        path: "/v3/merchant/amazon/products/live/advanced",
    },
    input: {
        schema: {
            body: zAmazonProductsBody.extend({
                depth: zAmazonProductsBody.shape.depth.unwrap().default(100),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            every: 100,
            consumes: { credit: "default", amount: 0.0033 },
            label: "results requested",
            description:
                "results asked for (depth, or max_crawl_pages pages), " +
                "billed per page of 100",
        },
        estimate: ({ data }) => ({
            counts: {
                RESULT: Math.max(
                    data.input.body.depth,
                    (data.input.body.max_crawl_pages ?? 1) * 100,
                ),
            },
        }),
    },
});
