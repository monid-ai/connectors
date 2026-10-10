import { z } from "zod";

/** TRDEFI /api/strategy-detail query params. */
export const zStrategyDetailQueryParams = z.object({
    hash: z.string().min(1).describe(
        "Strategy hash (0x-prefixed, 64 hex chars) of the position to " +
            "resolve — a hash returned by /api/strategies or /api/stats.",
    ),
}).strict();
