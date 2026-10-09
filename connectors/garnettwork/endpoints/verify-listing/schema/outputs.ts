import { z } from "zod";

/** Minimal native envelope. Additional fields, missing optional facts and null
 * unknowns remain untouched. No output projection. */
export const zVerifyListingOutput = z.looseObject({
    schema_version: z.literal("garnett-deal-or-disaster-v1"),
    decision: z.looseObject({
        verdict: z.enum(["PASS", "FAIL", "REFUSE"]),
    }),
});
