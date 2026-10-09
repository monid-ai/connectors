import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zNordstromProductBody } from "./schema/inputs.ts";

/** POST /api/nordstrom/pdp/sync — Nordstrom Product Details. */
export default defineEndpoint({
    meta: {
        displayName: "Nordstrom Product Details",
        summary:
            "Scrape a Nordstrom product page into its full product data object.",
        description:
            "Extract product data from a Nordstrom product page. Returns " +
            "the page's product data object with name, price, description, " +
            "images, SKUs and availability, and the surrounding page state. " +
            "Highest-priced scraper in the catalog. Suited for department- " +
            "store price monitoring and catalog enrichment.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["nordstrom"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/nordstrom/product",
    request: { method: "POST", path: "/api/nordstrom/pdp/sync" },
    input: { schema: { body: zNordstromProductBody } },
    usage: {
        /** 93 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 93 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
