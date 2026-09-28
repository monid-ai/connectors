import { z } from "zod";

/** `GET /v1/politicians/filings/{ticker}` query parameters. The window
 *  applies to the DISCLOSURE date, so it has its own description. */
export const zCongressTradesQueryParams = z.strictObject({
    lookbackDays: z.number().int().min(1).max(365).describe(
        "Days of disclosures to return, counted back from the disclosure " +
            "date (not the trade date), 1 to 365. The API defaults to 90.",
    ).optional(),
});
