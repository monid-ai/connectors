import { z } from "zod";

export const PER_CALL_MODEL_KIND = "PER_CALL" as const;

/**
 * Flat per-run pricing — the RUN is the product. The model + the run's
 * success flag say everything: billed 1 iff success, 0 on provider error.
 * No unit field and NO measure ("metered in calls" is not a thing — a
 * flat fee is not a count, so it never appears in `usage.units`; the
 * hosted rate card prices it straight off this kind). Also the flat
 * component COMPOSITE embeds (the apify actor-start charge event).
 */
export const zPerCallModel = z.strictObject({
    kind: z.literal(PER_CALL_MODEL_KIND),
});
export type PerCallModel = z.infer<typeof zPerCallModel>;
