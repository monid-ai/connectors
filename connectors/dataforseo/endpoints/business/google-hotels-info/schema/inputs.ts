import { z } from "zod";
import { zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/business_data/google/hotel_info/live/advanced` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zGoogleHotelsInfoBody = z.object({
    hotel_identifier: z.string().min(1).describe(
        "Unique hotel identifier (e.g. ChYIq6SB--i6p6cpGgovbS8wN2s5ODZfEAE)",
    ),
    ...zLocaleFields,
    check_in: z.iso.date().describe(
        "Check-in date (yyyy-mm-dd; default tomorrow)",
    ).optional(),
    check_out: z.iso.date().describe("Check-out date (yyyy-mm-dd)").optional(),
    currency: z.string().min(1).describe("Currency").optional(),
    adults: z.number().int().describe("Number of adults (e.g. 1)").optional(),
    children: z.array(z.number().int().min(0).max(17)).describe(
        "Age of each child (0-17), e.g. [13, 8]; up to 6 persons with adults",
    ).optional(),
    load_prices_by_dates: z.boolean().describe(
        "Load hotel stay prices by dates",
    ).optional(),
    prices_start_date: z.iso.date().describe(
        "Start date to load prices by dates (e.g. 2025-05-20)",
    ).optional(),
    prices_end_date: z.iso.date().describe(
        "End date to load prices by dates (e.g. 2025-05-21)",
    ).optional(),
    prices_date_range: z.string().min(1).describe(
        "Predefined period for retrieving daily price data (default month; values: month, three_months, six_months, year)",
    ).optional(),
}).strict();
