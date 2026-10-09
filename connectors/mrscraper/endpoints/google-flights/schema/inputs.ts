import { z } from "zod";
import { zIataCode, zIsoDate, zSearchCountry } from "../../../schema/common.ts";

/** POST /api/google-flight/cbc/sync body — the vendor mirror (the
 *  marketplace card via v1, 2026-09-17). A round trip needs a return date:
 *  the vendor's own rule, bound as a union in endpoint.ts. */

export const zGoogleFlightsSearchBody = z.object({
    origin: zIataCode.describe("Origin airport IATA code, e.g. 'JFK'."),
    destination: zIataCode.describe(
        "Destination airport IATA code, e.g. 'SIN'.",
    ),
    type: z.enum(["OW", "RT"]).describe(
        "Trip type: 'OW' one-way or 'RT' round-trip.",
    ),
    date: zIsoDate.describe("Departure date in YYYY-MM-DD format."),
    returnDate: zIsoDate.describe(
        "Return date in YYYY-MM-DD format; required for round-trip searches.",
    ).optional(),
    country: zSearchCountry.describe(
        "Two-letter Google region code for the edition, e.g. 'us'.",
    ),
}).strict();
