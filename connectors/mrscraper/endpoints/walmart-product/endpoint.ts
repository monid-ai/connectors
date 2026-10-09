import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWalmartProductBody } from "./schema/inputs.ts";

/** POST /api/walmart/pdp/sync — Walmart Product Details. */
export default defineEndpoint({
    meta: {
        displayName: "Walmart Product Details",
        summary:
            "Scrape a Walmart product page into pricing, stock, seller, and rating data.",
        description:
            "Extract product data from a Walmart product page: name, " +
            "current and list price, stock status, delivery estimate, " +
            "ratings and review counts, and seller/store details (name, " +
            "type, rating, location). Supports zip-code and store-ID " +
            "targeting for localized availability and inventory, and a " +
            "country code for the Walmart marketplace edition. Suited for " +
            "price monitoring, availability checks, and marketplace seller " +
            "research.",
        notes: [
            "May return the raw page HTML instead of parsed fields when the " +
            "vendor's structured parser is unavailable (observed in v1's " +
            "2026-08-31 drill); the run bills either way.",
        ],
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["walmart"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/walmart/product",
    request: { method: "POST", path: "/api/walmart/pdp/sync" },
    input: { schema: { body: zWalmartProductBody } },
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
