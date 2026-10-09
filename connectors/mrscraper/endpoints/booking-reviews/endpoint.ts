import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBookingReviewsBody } from "./schema/inputs.ts";

/** POST /api/hotels/booking/review/sync — Booking Hotel Reviews. */
export default defineEndpoint({
    meta: {
        displayName: "Booking Hotel Reviews",
        summary: "Scrape guest reviews from a Booking.com hotel page.",
        description:
            "Extract guest reviews from a Booking.com hotel page URL: " +
            "reviewer details, scores, stay duration, traveler type, and " +
            "positive/negative comments as structured data. Suited for " +
            "guest-sentiment analysis and reputation monitoring.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["hotels"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/booking/reviews",
    request: { method: "POST", path: "/api/hotels/booking/review/sync" },
    input: { schema: { body: zBookingReviewsBody } },
    usage: {
        /** 36 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 36 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
