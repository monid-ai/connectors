import { z } from "zod";

/** `GET /v1/documents/stories/ticker/{ticker}` query parameters. */
export const zStoriesByTickerQueryParams = z.strictObject({
    limit: z.number().int().min(1).describe(
        "Maximum stories to return. The API defaults to 5 and caps at 20.",
    ).optional(),
});
