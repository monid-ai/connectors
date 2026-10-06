import { z } from "zod";
import { zDepth, zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/business_data/google/hotel_searches/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zGoogleHotelsSearchBody = z.object({
    keyword: z.string().min(1).describe("Keyword").optional(),
    ...zLocaleFields,
    search_this_area: z.boolean().describe(
        "Show hotels from the displayed area (default true; values: true, false)",
    ).optional(),
    depth: zDepth(140, 18, 18),
    check_in: z.iso.date().describe(
        "Check-in date (yyyy-mm-dd; default tomorrow)",
    ).optional(),
    check_out: z.iso.date().describe("Check-out date (yyyy-mm-dd)").optional(),
    currency: z.string().min(1).describe("Currency").optional(),
    adults: z.number().int().describe("Number of adults (e.g. 1)").optional(),
    children: z.array(z.number().int().min(0).max(17)).describe(
        "Age of each child (0-17), e.g. [13, 8]; up to 6 persons with adults",
    ).optional(),
    stars: z.array(z.number().int().min(1).max(5)).describe(
        "Hotel star classes to keep, e.g. [3, 4, 5]",
    ).optional(),
    min_rating: z.number().describe("Minimum rating (e.g. 2.5)").optional(),
    sort_by: z.string().min(1).describe(
        "Results sorting parameters (default relevance)",
    ).optional(),
    min_price: z.number().int().describe(
        "Minimum price per night (e.g. 100)",
    ).optional(),
    max_price: z.number().int().describe(
        "Maximum price per night (e.g. 600)",
    ).optional(),
    free_cancellation: z.boolean().describe(
        "Hotels with a free cancellation (default false)",
    ).optional(),
    is_vacation_rentals: z.boolean().describe(
        "Search for vacation rentals (default false)",
    ).optional(),
    amenities: z.array(z.string().min(1)).describe(
        "Hotel amenities to require, e.g. air_conditioning, free_breakfast; full list in the vendor docs",
    ).optional(),
}).strict();
