import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSegariProductBody } from "./schema/inputs.ts";

/** POST /api/segari/pdp/sync — Segari Product Details. */
export default defineEndpoint({
    meta: {
        displayName: "Segari Product Details",
        summary:
            "Scrape a Segari (Indonesia) grocery product page into price, stock, rating, and limits.",
        description:
            "Extract product data from a Segari product page. Returns the " +
            "product record, current and pre-discount price in IDR, " +
            "discount, rating and review count, available quantity and " +
            "stock flag, per-user daily purchase limit, and listing status. " +
            "Suited for Indonesian online-grocery price and availability " +
            "monitoring.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["segari"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/segari/product",
    request: { method: "POST", path: "/api/segari/pdp/sync" },
    input: { schema: { body: zSegariProductBody } },
    usage: {
        /** 24 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 24 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
