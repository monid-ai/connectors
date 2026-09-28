import { z } from "zod";

export const zRwaDetailPathParams = z.object({
    asset_id: z.string().regex(/^\d+$/).describe(
        "Numeric Philidor asset id, returned by philidor#rwa.",
    ),
});
