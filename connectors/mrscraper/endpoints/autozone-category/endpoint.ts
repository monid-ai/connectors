import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAutozoneCategoryBody } from "./schema/inputs.ts";

/** POST /api/autozone/category/sync — AutoZone Category Listings. */
export default defineEndpoint({
    meta: {
        displayName: "AutoZone Category Listings",
        summary:
            "Scrape an AutoZone category page into its product shelf with pagination and filters.",
        description:
            "Extract product listings from an AutoZone category URL. " +
            "Returns the product shelf results with pagination, filters, " +
            "and product records, plus interchange-search and redirect " +
            "flags. Supports a page number and a preferred store ID for " +
            "localized pricing and availability. Suited for assortment " +
            "tracking and category-level price monitoring.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["autozone"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/autozone/category",
    request: { method: "POST", path: "/api/autozone/category/sync" },
    input: { schema: { body: zAutozoneCategoryBody } },
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
