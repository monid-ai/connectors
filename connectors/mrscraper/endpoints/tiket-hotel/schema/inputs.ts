import { z } from "zod";
import {
    zCurrency,
    zGuestCounts,
    zIsoDate,
    zLocale,
    zLoginFlag,
} from "../../../schema/common.ts";

/** POST /api/tiket/hotel/sync body — the vendor mirror (the marketplace card via v1, 2026-09-17). */
export const zTiketHotelBody = z.object({
    hotelId: z.string().min(1).describe(
        "Tiket.com hotel identifier (from the hotel page URL).",
    ),
    checkIn: zIsoDate.describe("Check-in date in YYYY-MM-DD format."),
    checkOut: zIsoDate.describe("Check-out date in YYYY-MM-DD format."),
    ...zGuestCounts,
    currency: zCurrency,
    locale: zLocale,
    login: zLoginFlag,
}).strict();
