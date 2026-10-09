import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLazadaCategoryBody } from "./schema/inputs.ts";

/** POST /api/lazada/cbc/sync — Lazada Category Listings. */
export default defineEndpoint({
    meta: {
        displayName: "Lazada Category Listings",
        summary:
            "Scrape product listings from a Lazada category or search page.",
        description:
            "Extract product listings from a Lazada category or search URL " +
            "(any Lazada country site): titles, prices, ratings, and " +
            "listing URLs as structured data. May return a CAPTCHA " +
            "challenge response when the platform's bot protection " +
            "triggers. Suited for Southeast-Asia market research and " +
            "assortment tracking.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["lazada"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/lazada/category",
    request: { method: "POST", path: "/api/lazada/cbc/sync" },
    // the vendor lists 60 s+ latency for this scraper; v1's 330 s budget
    timeouts: { requestMs: 330_000, runMs: 330_000 },
    input: { schema: { body: zLazadaCategoryBody } },
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
