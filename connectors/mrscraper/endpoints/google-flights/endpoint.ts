import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleFlightsSearchBody } from "./schema/inputs.ts";

/** POST /api/google-flight/cbc/sync — Google Flights itineraries. */
export default defineEndpoint({
    meta: {
        displayName: "Search Google Flights",
        summary:
            "Search Google Flights for one-way or round-trip itineraries between two airports.",
        description: "Run a Google Flights search between two IATA airport " +
            "codes on a date. Returns the search parameters, passenger and " +
            "fare configuration, the outbound itineraries with airline, " +
            "times, duration, stops, and price, the total found, cabin " +
            "class, and the source URL. Supports one-way or round-trip and " +
            "a country code for the Google edition. Suited for fare " +
            "monitoring, route research, and travel planning agents.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["flights"],
        // The round-trip rule is NOT here: it survives into the compiled
        // input schema as an `anyOf` (clay D13).
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/google/flights",
    request: { method: "POST", path: "/api/google-flight/cbc/sync" },
    // "returnDate is required when type is RT" — the vendor's rule, bound
    // as a union so it survives compilation as `anyOf` (clay D13; v1
    // enforced it with a `.refine`).
    input: {
        schema: {
            body: z.union([
                zGoogleFlightsSearchBody.extend({
                    type: z.literal("OW").describe("Trip type: one-way."),
                }),
                zGoogleFlightsSearchBody.extend({
                    type: z.literal("RT").describe("Trip type: round-trip."),
                }).required({ returnDate: true }),
            ]).describe(
                "A one-way (OW) search, or a round-trip (RT) search with a " +
                    "returnDate.",
            ),
        },
    },
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
