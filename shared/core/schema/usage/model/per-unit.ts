import { z } from "zod";
import { zUnit } from "../unit.ts";

export const PER_UNIT_MODEL_KIND = "PER_UNIT" as const;

/**
 * Metered pricing — billed per N of `unit` (RESULT, CREDIT, PAGE, TOKEN,
 * time…): the counted quantity is the product; consolidate/estimate
 * report it as a `usage.counts` entry and the hosted rate card
 * multiplies. PURE scalar: no base-fee side pocket — combining with a
 * flat component is COMPOSITE's job (design D18). CALL is not in zUnit,
 * so "metered in calls" cannot be written; PER_CALL is its own kind.
 */
export const zPerUnitModel = z.strictObject({
    kind: z.literal(PER_UNIT_MODEL_KIND),
    unit: zUnit,
    /** Human note on WHAT the count means when the fn derives it (e.g.
     *  exa: "results above the 10 included in the base fee"; linkedin:
     *  "profiles scraped in 'Full' mode"). Documentation only — never a
     *  join key (design D19). */
    description: z.string().min(1).optional(),
});
export type PerUnitModel = z.infer<typeof zPerUnitModel>;
