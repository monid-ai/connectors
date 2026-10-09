import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokProductBody } from "./schema/inputs.ts";

/** POST /api/tiktok/pdp/sync — TikTok Shop Product. */
export default defineEndpoint({
    meta: {
        displayName: "TikTok Shop Product",
        summary:
            "Scrape a TikTok Shop product page into structured product data.",
        description:
            "Extract data from a TikTok Shop product page: canonical " +
            "product URL, product ID and category, routing metadata, region " +
            "data, and bot-detection/WAF context as structured data. " +
            "Supports optional JavaScript rendering. Suited for TikTok Shop " +
            "catalog tracking and product-level page analysis.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["tiktok-shop"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/tiktok/product",
    request: { method: "POST", path: "/api/tiktok/pdp/sync" },
    input: { schema: { body: zTiktokProductBody } },
    usage: {
        /** 12 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 12 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
