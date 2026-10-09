import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTripHotelBody } from "./schema/inputs.ts";

/** POST /api/trip/hotel/sync — Trip.com Hotel Details. */
export default defineEndpoint({
    meta: {
        displayName: "Trip.com Hotel Details",
        summary:
            "Scrape Trip.com hotel details and rates by hotel ID and stay dates.",
        description:
            "Fetch hotel details and live rates from Trip.com for one hotel " +
            "and stay period by hotel ID: room types, pricing, and " +
            "availability as structured data. Takes check-in/check-out " +
            "dates, room and guest counts, currency, and locale. Suited for " +
            "rate monitoring without needing a full page URL.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["hotels"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/trip/hotel",
    request: { method: "POST", path: "/api/trip/hotel/sync" },
    input: { schema: { body: zTripHotelBody } },
    usage: {
        /** 20 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 20 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
