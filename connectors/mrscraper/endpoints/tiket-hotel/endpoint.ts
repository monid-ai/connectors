import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiketHotelBody } from "./schema/inputs.ts";

/** POST /api/tiket/hotel/sync — Tiket Hotel Details. */
export default defineEndpoint({
    meta: {
        displayName: "Tiket Hotel Details",
        summary: "Scrape Tiket.com hotel details and rates for a stay period.",
        description:
            "Fetch hotel details and live rates from Tiket.com for one " +
            "hotel and stay period: pricing, reviews, facilities, and " +
            "location data. Takes the Tiket hotel ID, check-in/check-out " +
            "dates, room and guest counts, currency, and locale. Suited for " +
            "Indonesian-market rate monitoring and hotel research.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["hotels"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/tiket/hotel",
    request: { method: "POST", path: "/api/tiket/hotel/sync" },
    input: { schema: { body: zTiketHotelBody } },
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
