import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zAmazonAsinBody } from "./schema/inputs.ts";

/**
 * Amazon Product Details — `POST /v3/merchant/amazon/asin/live/advanced` (v1
 * `/amazon/asin`). Flat: $0.005 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Amazon Product Details",
        summary: "Fetch an Amazon product page by ASIN: price, variants, " +
            "rating, specs.",
        description: "Amazon product details for an ASIN in a marketplace " +
            "location. Returns title, brand, price and currency, " +
            "availability, rating and review count, images, bullet " +
            "points, description, categories, variants, product details " +
            "table, and buy-box seller. Suited for catalogue enrichment " +
            "and price tracking. To find the location_code or exact " +
            "location_name for an Amazon marketplace, call " +
            "dataforseo#amazon/locations (free lookup, country filter + " +
            "search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/merchant/amazon/asin/live/advanced/",
        categories: ["amazon"],
    },
    endpoint: "/amazon/asin",
    request: { method: "POST", path: "/v3/merchant/amazon/asin/live/advanced" },
    input: { schema: { body: zAmazonAsinBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.005 },
        },
    },
});
