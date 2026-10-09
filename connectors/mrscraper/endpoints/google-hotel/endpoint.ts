import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleHotelBody } from "./schema/inputs.ts";

/** POST /api/google/serp/sync — booking sites and prices for one Google
 *  Hotels entity. */
export default defineEndpoint({
    meta: {
        displayName: "Google Hotels Booking Prices",
        summary:
            "Scrape a Google Hotels entity page into booking sites and their nightly prices.",
        description: "Extract the price comparison from one Google Hotels " +
            "entity URL. Returns the hotel name, check-in and check-out " +
            "dates, currency, location context, and the list of booking " +
            "options with provider name, price, and deep link. Suited for " +
            "hotel rate-parity checks across OTAs and for finding the " +
            "cheapest booking channel for a known hotel.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["hotels"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/google/hotel",
    request: { method: "POST", path: "/api/google/serp/sync" },
    input: { schema: { body: zGoogleHotelBody } },
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
