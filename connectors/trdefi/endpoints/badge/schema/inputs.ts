import { z } from "zod";

/** TRDEFI /api/badge query params. */
export const zBadgeQueryParams = z.object({
    metric: z.string().min(1).optional().describe(
        "Metric to render as a shields.io badge payload: 'volume30' " +
            "(default), 'volume7', 'volume1', 'strategies', 'makers', " +
            "'pairs' or 'chains'.",
    ),
}).strict();
