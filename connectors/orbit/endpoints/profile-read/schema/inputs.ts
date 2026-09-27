import { z } from "zod";

export const zProfileReadPathParams = z.strictObject({
    profile_id: z.string().min(1).describe(
        "An Orbit profile id, an alias id, or a public slug.",
    ),
});
