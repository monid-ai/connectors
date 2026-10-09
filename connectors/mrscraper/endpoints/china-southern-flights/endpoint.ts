import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zChinaSouthernFlightsBody } from "./schema/inputs.ts";

/** POST /api/china-south/flight/sync — China Southern Fare Search. */
export default defineEndpoint({
    meta: {
        displayName: "China Southern Fare Search",
        summary:
            "Search China Southern Airlines fares between two airports for a departure date.",
        description:
            "Query China Southern Airlines for flights between two IATA " +
            "airport codes on a date. Returns the itinerary list with " +
            "departure segments, return segments where present, and " +
            "available fare options. Takes passenger counts, fare class, " +
            "locale, and currency. Suited for airline-direct fare " +
            "monitoring and China route research.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["flights"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/china-southern/flights",
    request: { method: "POST", path: "/api/china-south/flight/sync" },
    input: { schema: { body: zChinaSouthernFlightsBody } },
    usage: {
        /** 2 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 2 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
