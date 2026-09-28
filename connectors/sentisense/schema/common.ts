import { z } from "zod";

/** `{ticker}` path parameter, shared by every per-stock endpoint. */
export const zTickerPathParams = z.strictObject({
    ticker: z.string().min(1).max(12).describe(
        "US stock ticker, case-insensitive (e.g. `NVDA`, `brk.b`).",
    ),
});

/** `lookbackDays` query parameter of the insider and congressional reads.
 *  The API answers 400 outside 1..365, so the mirror states the range. */
export const zLookbackDays = z.number().int().min(1).max(365).describe(
    "Days of history to return, 1 to 365. The API defaults to 90.",
);
