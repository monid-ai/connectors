import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBookingRatesBody } from "./schema/inputs.ts";

/** POST /api/hotels/booking/rates/sync — Booking Hotel Rates. */
export default defineEndpoint({
    meta: {
        displayName: "Booking Hotel Rates",
        summary: "Scrape live Booking.com room rates from a hotel page URL.",
        description:
            "Fetch live room rates and rate plans from a Booking.com hotel " +
            "page URL (with the stay dates in the URL's own query " +
            "parameters): pricing, meal inclusions, cancellation policy, " +
            "refundability, and promotion details as structured data. " +
            "Suited for rate-parity monitoring and competitor pricing.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["hotels"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/booking/rates",
    request: { method: "POST", path: "/api/hotels/booking/rates/sync" },
    input: { schema: { body: zBookingRatesBody } },
    usage: {
        /** 41 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 41 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
