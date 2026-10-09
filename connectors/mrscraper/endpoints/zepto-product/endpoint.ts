import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zZeptoProductBody } from "./schema/inputs.ts";

/** POST /api/zepto/pdp/sync — Zepto Product Details. */
export default defineEndpoint({
    meta: {
        displayName: "Zepto Product Details",
        summary:
            "Scrape a Zepto (India) product page for a pincode into price, availability, and details.",
        description:
            "Extract product data from a Zepto product URL for a delivery " +
            "pincode. Returns the product URL and the detail object with " +
            "name, pricing, ratings, availability, highlights, and seller " +
            "information for that location. Takes the pincode as a required " +
            "input. Suited for Indian quick-commerce price and regional " +
            "availability tracking.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["zepto"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/zepto/product",
    request: { method: "POST", path: "/api/zepto/pdp/sync" },
    input: { schema: { body: zZeptoProductBody } },
    usage: {
        /** 9 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 9 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
