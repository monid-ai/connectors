import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLazadaProductBody } from "./schema/inputs.ts";

/** POST /api/lazada/pdp/sync — Lazada Product Details. */
export default defineEndpoint({
    meta: {
        displayName: "Lazada Product Details",
        summary:
            "Scrape a Lazada product page into pricing, stock, and seller data.",
        description:
            "Extract product data from a Lazada product page (any Lazada " +
            "country site): pricing, rating, reviews, stock status, " +
            "delivery details, and seller/store information as structured " +
            "data. Suited for Southeast-Asia price monitoring and " +
            "marketplace seller research.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["lazada"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/lazada/product",
    request: { method: "POST", path: "/api/lazada/pdp/sync" },
    input: { schema: { body: zLazadaProductBody } },
    usage: {
        /** 10 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 10 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
