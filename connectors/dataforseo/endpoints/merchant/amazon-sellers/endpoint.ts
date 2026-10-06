import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zAmazonSellersBody } from "./schema/inputs.ts";

/**
 * Amazon Product Sellers — `POST /v3/merchant/amazon/sellers/live/advanced`
 * (v1 `/amazon/sellers`). Flat: $0.0033 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Amazon Product Sellers",
        summary: "List sellers offering an ASIN with price, condition, and " +
            "shipping.",
        description:
            "Sellers of an Amazon product by ASIN. Returns per offer the " +
            "seller name and id, price and currency, condition, shipping " +
            "cost and time, Prime flag, rating, and whether it holds the " +
            "buy box. Suited for buy-box and reseller monitoring. To find " +
            "the location_code or exact location_name for an Amazon " +
            "marketplace, call dataforseo#amazon/locations (free lookup, " +
            "country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/merchant/amazon/sellers/live/advanced/",
        categories: ["amazon"],
    },
    endpoint: "/amazon/sellers",
    request: {
        method: "POST",
        path: "/v3/merchant/amazon/sellers/live/advanced",
    },
    input: { schema: { body: zAmazonSellersBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.0033 },
        },
    },
});
