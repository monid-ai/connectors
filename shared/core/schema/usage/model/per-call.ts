import { z } from "zod";

export const PER_CALL_MODEL_KIND = "PER_CALL" as const;

/**
 * Flat per-run pricing — the RUN is the product. Billed 1 iff success,
 * 0 on provider error; the quantity is structurally constant, so fns
 * never write it — the ENGINE appends the flat `1` to `usage.counts` at
 * estimate and success settle (design D24: counts is the COMPLETE billed
 * vector — leaf PER_CALL under the reserved `CALL` key, a composite flat
 * component under its own id). Also the flat component COMPOSITE embeds
 * (the apify actor-start charge event).
 */
export const zPerCallModel = z.strictObject({
    kind: z.literal(PER_CALL_MODEL_KIND),
    /** OPTIONAL short display name for billing surfaces (e.g. "base fee").
     *  Rendering is services-side with the KEY as fallback:
     *  `${label ?? key} × ${count}` — the key itself is the vendor join
     *  and never changes for display reasons (design D24). */
    label: z.string().min(1).max(40).optional(),
    /** Human note on WHAT the flat charge covers when it isn't obvious
     *  (e.g. exa: "base fee — includes the first 10 results").
     *  Documentation only — never a join key (design D19). */
    description: z.string().min(1).optional(),
});
export type PerCallModel = z.infer<typeof zPerCallModel>;
