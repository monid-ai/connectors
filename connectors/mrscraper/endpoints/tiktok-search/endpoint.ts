import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokSearchBody } from "./schema/inputs.ts";

/** POST /api/tiktok/search — Search TikTok Shop. */
export default defineEndpoint({
    meta: {
        displayName: "Search TikTok Shop",
        summary:
            "Search TikTok Shop products by keyword and get structured listings back.",
        description:
            "Search TikTok Shop by keyword and get product listings back as " +
            "structured data: titles, prices, sellers, and product URLs, " +
            "with a total product count. Supports a result-count knob. " +
            "Suited for social-commerce trend research and competitor " +
            "assortment tracking.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["tiktok-shop"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/tiktok/search",
    request: { method: "POST", path: "/api/tiktok/search" },
    input: { schema: { body: zTiktokSearchBody } },
    usage: {
        /** 20 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 20 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
