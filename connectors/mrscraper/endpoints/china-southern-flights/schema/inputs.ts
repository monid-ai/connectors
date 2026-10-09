import { z } from "zod";
import {
    zCurrency,
    zIataCode,
    zIsoDate,
    zLocale,
} from "../../../schema/common.ts";

/** POST /api/china-south/flight/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17). */
export const zChinaSouthernFlightsBody = z.object({
    origin: zIataCode.describe("Departure airport IATA code, e.g. 'BKK'."),
    dest: zIataCode.describe("Destination airport IATA code, e.g. 'CGK'."),
    adult: z.number().int().min(1).describe("Number of adult passengers."),
    child: z.number().int().min(0).describe("Number of child passengers."),
    infant: z.number().int().min(0).describe("Number of infant passengers."),
    dptDate: zIsoDate.describe("Departure date in YYYY-MM-DD format."),
    fareClass: z.enum(["economy", "business"]).describe("Travel class."),
    locale: zLocale,
    currency: zCurrency,
}).strict();
