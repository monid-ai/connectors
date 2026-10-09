import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zProductBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Extract Product",
        summary:
            "Detect whether a URL is a product page and extract a normalized product record.",
        description: "Turn a single product page into structured commerce " +
            "data: name, description, price and regular price with " +
            "currency, billing frequency and pricing model, category, " +
            "availability, dimensions, features, target audience, tags, " +
            "imagery, and SKU. Context.dev first classifies the URL " +
            "(Amazon, TikTok Shop, Etsy, or generic), so a non-product page " +
            "is reported as such rather than hallucinated into a product. " +
            "Built for catalog ingestion, competitive pricing monitors, and " +
            "merchandising workflows.",
        docsUrl:
            "https://docs.context.dev/api-reference/web-extraction/product",
        categories: ["web-extraction"],
    },
    request: { method: "POST", path: "/brand/ai/product" },
    input: { schema: { body: zProductBody } },
    timeouts: { requestMs: 310_000, runMs: 310_000 },
    usage: {
        /** 10 credits per call — https://www.context.dev/pricing
         *  (2026-09-17). */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "product extractions",
            consumes: { credit: "default", amount: 10 },
        },
    },
});
