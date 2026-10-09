import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWatsonsCategoryBody } from "./schema/inputs.ts";

/** POST /api/watsons/category/sync — Watsons Category Listings. */
export default defineEndpoint({
    meta: {
        displayName: "Watsons Category Listings",
        summary:
            "Scrape a Watsons category page into its product list with prices and total count.",
        description:
            "Extract product listings from a Watsons category URL (any " +
            "country site). Returns the category URL, currency, total " +
            "product count, and the product list with name, price, and URL. " +
            "Suited for health-and-beauty retail assortment tracking across " +
            "Asian markets.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["watsons"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/watsons/category",
    request: { method: "POST", path: "/api/watsons/category/sync" },
    input: { schema: { body: zWatsonsCategoryBody } },
    usage: {
        /** 21 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 21 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
