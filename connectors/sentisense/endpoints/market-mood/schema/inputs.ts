import { z } from "zod";

/** `GET /v2/market-mood` query parameters. */
export const zMarketMoodQueryParams = z.strictObject({
    days: z.number().int().min(1).describe(
        "Days of daily history to return. The API defaults to 180.",
    ).optional(),
});
