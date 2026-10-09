import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zExtractBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Extract Structured Data",
        summary:
            "Crawl a website and return JSON matching a caller-supplied JSON Schema.",
        description: "Point Context.dev at a website, hand it a JSON " +
            "Schema plus optional instructions, and get back typed data " +
            "ready to drop into a product, agent, or workflow — no per-site " +
            "scraper. Context.dev prioritizes the internal links most " +
            "likely to answer the schema, reads up to maxPages pages (hard " +
            "cap 50), and fills the requested shape. factCheck: true " +
            "restricts every value to facts stated on the page while the " +
            "default allows reasonable inference for derived fields. " +
            "Typical uses: lead enrichment, pricing and packaging capture, " +
            "hiring signals, compliance evidence.",
        docsUrl:
            "https://docs.context.dev/api-reference/web-extraction/extract",
        categories: ["web-extraction"],
    },
    request: { method: "POST", path: "/web/extract" },
    input: { schema: { body: zExtractBody } },
    timeouts: { requestMs: 310_000, runMs: 310_000 },
    usage: {
        /** 10 credits per call, whatever the schema size or page count —
         *  https://www.context.dev/pricing (2026-09-17). */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "extractions",
            consumes: { credit: "default", amount: 10 },
        },
    },
});
