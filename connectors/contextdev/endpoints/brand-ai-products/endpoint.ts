import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zProductsBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Extract Products",
        summary: "Build a structured product catalog from a brand's website.",
        description: "Analyze a brand's website and return a list of its " +
            "products as normalized records — name, description, price and " +
            "regular price with currency, billing frequency, pricing " +
            "model, category, availability, features, target audience, " +
            "images, and SKU — without writing a per-site scraper. Start " +
            "from a domain (Context.dev finds the relevant catalog or " +
            "pricing pages) or from an exact URL, and cap the result count " +
            "with maxProducts (up to 12). Useful for competitor tracking, " +
            "marketplace onboarding, and pricing intelligence.",
        docsUrl:
            "https://docs.context.dev/api-reference/web-extraction/products",
        categories: ["web-extraction"],
        notes: [
            "Beta: with an explicit timeoutOpts, a truncated extraction is an " +
            "unbilled 408 unless behavior is return-partial.",
        ],
    },
    request: { method: "POST", path: "/brand/ai/products" },
    input: { schema: { body: zProductsBody } },
    timeouts: { requestMs: 310_000, runMs: 310_000 },
    usage: {
        /** 10 credits per call, however many products —
         *  https://www.context.dev/pricing (2026-09-17). */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "catalog extractions",
            consumes: { credit: "default", amount: 10 },
        },
    },
});
