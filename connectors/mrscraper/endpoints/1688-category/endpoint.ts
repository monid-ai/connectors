import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z1688CategoryBody } from "./schema/inputs.ts";

/** POST /api/1688/cbc/sync — 1688 Category Listings. */
export default defineEndpoint({
    meta: {
        displayName: "1688 Category Listings",
        summary:
            "Scrape product listings from a 1688.com search or category page.",
        description:
            "Extract wholesale product listings from a 1688.com search or " +
            "category URL, including offers surfaced by the platform's own " +
            "recommendation API \u2014 titles, prices, suppliers, and listing " +
            "URLs as structured data. Suited for China-sourcing research, " +
            "wholesale price comparison, and supplier discovery.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["1688"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/1688/category",
    request: { method: "POST", path: "/api/1688/cbc/sync" },
    input: { schema: { body: z1688CategoryBody } },
    usage: {
        /** 29 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 29 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
