import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zExpediaSearchBody } from "./schema/inputs.ts";

/** POST /api/hotels/expedia/search/sync — Expedia Hotel Search. */
export default defineEndpoint({
    meta: {
        displayName: "Expedia Hotel Search",
        summary:
            "Scrape Expedia hotel search results for a destination and dates.",
        description:
            "Extract hotel search results from an Expedia Hotel-Search URL: " +
            "property listings with hotel name, rating, pricing, images, " +
            "location, and card links for the destination and date range " +
            "encoded in the URL. Suited for market surveys, availability " +
            "sweeps, and competitor set discovery.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["hotels"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/expedia/search",
    request: { method: "POST", path: "/api/hotels/expedia/search/sync" },
    input: { schema: { body: zExpediaSearchBody } },
    usage: {
        /** 26 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 26 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
