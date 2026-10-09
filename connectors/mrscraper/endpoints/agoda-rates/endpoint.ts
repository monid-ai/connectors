import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAgodaRatesBody } from "./schema/inputs.ts";

/** POST /api/hotels/agoda/rates/sync — Agoda Hotel Rates. */
export default defineEndpoint({
    meta: {
        displayName: "Agoda Hotel Rates",
        summary:
            "Scrape an Agoda hotel page URL into a flat list of room rate plans with prices.",
        description:
            "Fetch the live rate plans from one Agoda hotel page URL whose " +
            "query string carries the stay (check-in, nights, guests, " +
            "currency). Returns one row per room rate plan: hotel and room " +
            "name, arrival date, length of stay, total price and currency, " +
            "maximum persons, meal inclusion, cancellation and VAT flags, " +
            "promotion name and discount, rate plan name with meal plan, " +
            "cancellation policy, refundability, inclusions, and sold-out " +
            "status. Supports a proxy country that changes the displayed " +
            "market. Use /agoda/hotel instead when you only have the hotel " +
            "ID or need the hotel profile and Agoda's price breakdown. " +
            "Suited for rate-parity monitoring and competitor pricing.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["hotels"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/agoda/rates",
    request: { method: "POST", path: "/api/hotels/agoda/rates/sync" },
    input: { schema: { body: zAgodaRatesBody } },
    usage: {
        /** 46 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 46 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
