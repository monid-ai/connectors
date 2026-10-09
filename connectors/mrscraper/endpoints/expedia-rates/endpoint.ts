import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zExpediaRatesBody } from "./schema/inputs.ts";

/** POST /api/hotels/expedia/detail/sync — Expedia Hotel Rates. */
export default defineEndpoint({
    meta: {
        displayName: "Expedia Hotel Rates",
        summary:
            "Scrape an Expedia hotel page URL into its room offers, pricing, and page HTML.",
        description:
            "Fetch the room offers from one Expedia hotel page URL whose " +
            "query string carries the stay dates. Returns Expedia's own " +
            "property-offers GraphQL responses (room listings, pricing, " +
            "loyalty messaging, highlighted benefits, navigation) plus the " +
            "raw page HTML. Suited for rate-parity monitoring and " +
            "competitor pricing where Expedia's full offer payload is " +
            "wanted.",
        notes: [
            "Responses carry Expedia's full offer payload plus the page " +
            "HTML and can run to several megabytes; they arrive inline.",
        ],
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["hotels"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/expedia/rates",
    request: { method: "POST", path: "/api/hotels/expedia/detail/sync" },
    input: { schema: { body: zExpediaRatesBody } },
    usage: {
        /** 31 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 31 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
