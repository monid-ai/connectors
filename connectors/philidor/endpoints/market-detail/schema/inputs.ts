import { z } from "zod";

export const zMarketDetailPathParams = z.object({
    id: z.string().min(1).describe(
        "Philidor market id, such as aave-v3-1-ethereum.",
    ),
});
