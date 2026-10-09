import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAmazonProductBody } from "./schema/inputs.ts";

/** POST /api/amazon/pdp/sync — Amazon Product Details. */
export default defineEndpoint({
    meta: {
        displayName: "Amazon Product Details",
        summary:
            "Scrape an Amazon product page into structured details, pricing, and reviews data.",
        description:
            "Extract comprehensive product data from an Amazon product " +
            "page: ASIN and parent ASIN, brand, title, pricing, " +
            "availability, ratings and review counts, specifications, " +
            "images, videos, delivery info, categories, and brand content. " +
            "Works across Amazon country sites. Suited for price " +
            "monitoring, catalog enrichment, competitor tracking, and " +
            "market research.",
        notes: [
            "Responses can be several megabytes (a 3 MB body was measured " +
            "in v1) and arrive inline.",
        ],
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["amazon"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/amazon/product",
    request: { method: "POST", path: "/api/amazon/pdp/sync" },
    input: { schema: { body: zAmazonProductBody } },
    usage: {
        /** 50 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 50 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
