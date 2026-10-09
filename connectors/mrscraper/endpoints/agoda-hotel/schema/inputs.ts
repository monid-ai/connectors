import { z } from "zod";
import {
    zCurrency,
    zGuestCounts,
    zIsoDate,
    zLocale,
    zLoginFlag,
} from "../../../schema/common.ts";

/** POST /api/hotels/agoda/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17). */
export const zAgodaHotelBody = z.object({
    hotelId: z.number().int().min(1).describe(
        "Agoda's numeric hotel ID (from the hotel page or a prior " +
            "search).",
    ),
    checkIn: zIsoDate.describe("Check-in date in YYYY-MM-DD format."),
    checkOut: zIsoDate.describe("Check-out date in YYYY-MM-DD format."),
    ...zGuestCounts,
    currency: zCurrency,
    locale: zLocale,
    login: zLoginFlag,
}).strict();
