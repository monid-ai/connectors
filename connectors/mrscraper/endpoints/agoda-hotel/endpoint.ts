import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAgodaHotelBody } from "./schema/inputs.ts";

/** POST /api/hotels/agoda/sync — Agoda Hotel Details by ID. */
export default defineEndpoint({
    meta: {
        displayName: "Agoda Hotel Details by ID",
        summary:
            "Fetch an Agoda hotel by ID and stay dates into hotel details and per-room offers.",
        description:
            "Fetch one Agoda hotel by its numeric hotel ID for a stay " +
            "period. Returns the request specs, the hotel detail block " +
            "(name, star rating, address, guest rating, review count, " +
            "image), and the room inventory grouped by platform with each " +
            "room's name, image, occupancy, breakfast and refund flags, and " +
            "Agoda's full pricing breakdown (taxes, fees, discounts, " +
            "cashback, pay-at-hotel). Takes check-in/check-out dates, room " +
            "and guest counts, currency, and locale. Use /agoda/rates " +
            "instead when you have the hotel page URL and want a flat per- " +
            "room rate-plan list. Suited for hotel profile enrichment and " +
            "discount-structure analysis.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["hotels"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/agoda/hotel",
    request: { method: "POST", path: "/api/hotels/agoda/sync" },
    input: { schema: { body: zAgodaHotelBody } },
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
