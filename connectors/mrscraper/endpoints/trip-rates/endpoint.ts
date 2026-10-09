import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTripRatesBody } from "./schema/inputs.ts";

/** POST /api/hotels/trip/rates/sync — Trip.com Hotel Rates. */
export default defineEndpoint({
    meta: {
        displayName: "Trip.com Hotel Rates",
        summary: "Scrape live Trip.com room rates from a hotel page URL.",
        description:
            "Fetch live room rates and rate plans from a Trip.com hotel " +
            "detail page URL (stay dates ride the URL's own query " +
            "parameters): pricing, meal inclusions, cancellation policy, " +
            "and promotion data as structured output. Suited for rate- " +
            "parity monitoring and competitor pricing.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["hotels"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/trip/rates",
    request: { method: "POST", path: "/api/hotels/trip/rates/sync" },
    input: { schema: { body: zTripRatesBody } },
    usage: {
        /** 30 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 30 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
