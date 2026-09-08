import { z } from "zod";

export const PER_CALL_MODEL_KIND = "PER_CALL" as const;

/**
 * Flat per-run pricing — the RUN is the product. The model + the run's
 * success flag say everything: billed 1 iff success, 0 on provider error.
 * No unit field and NO count ("metered in calls" is not a thing — a
 * flat fee is not a count, so it never appears in `usage.counts`; the
 * hosted rate card prices it straight off this kind). Also the flat
 * component COMPOSITE embeds (the apify actor-start charge event).
 */
export const zPerCallModel = z.strictObject({
    kind: z.literal(PER_CALL_MODEL_KIND),
    /** Human note on WHAT the flat charge covers when it isn't obvious
     *  (e.g. exa: "base fee — includes the first 10 results").
     *  Documentation only — never a join key (design D19). */
    description: z.string().min(1).optional(),
});
export type PerCallModel = z.infer<typeof zPerCallModel>;
