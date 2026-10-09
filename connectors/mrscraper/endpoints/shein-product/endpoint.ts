import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSheinProductBody } from "./schema/inputs.ts";

/** POST /api/commerce/shein/v4/detail/sync — Shein Product Details. */
export default defineEndpoint({
    meta: {
        displayName: "Shein Product Details",
        summary:
            "Scrape a Shein product page into structured product and pricing data.",
        description:
            "Extract product data from a Shein product page (any Shein " +
            "country site): product information, pricing, attributes, " +
            "variants, and media, alongside the raw page HTML. Supports " +
            "optional JavaScript rendering for dynamic content. Suited for " +
            "fast-fashion price tracking, catalog enrichment, and trend " +
            "research.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["shein"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/shein/product",
    request: { method: "POST", path: "/api/commerce/shein/v4/detail/sync" },
    input: {
        schema: {
            /** The marketplace marks `render` required; the binding supplies
             *  the vendor default (v1 syncPostStart; design D11). */
            body: zSheinProductBody.extend({
                render: zSheinProductBody.shape.render.unwrap().default(false),
            }),
        },
    },
    usage: {
        /** 30 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 30 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
