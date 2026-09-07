import { z } from "zod";
import { zJson } from "../json/type.ts";
import { zMeasure } from "./unit.ts";
import { zMonetaryValue } from "./monetary.ts";

/**
 * The `usage` half of the settle fn (`usage.consolidate`) result, validated
 * at runtime (FN_CONTRACT on mismatch):
 * `units` = COUNTED billable quantities in vendor-NATIVE units (what the
 * hosted rate card multiplies). EMPTY is legal and meaningful — the
 * canonical "nothing counted": a PER_CALL run's flat charge is fully
 * described by the model + the success flag (never a fake measure), and
 * every zero/error path is unit-agnostic (design D18).
 * `cost` = the vendor's OWN reported price, READ from the response (never
 * computed by us), as a MonetaryValue (micro-dollar canon);
 * `evidence` = audit receipts (raw values kept for invoices/debugging, not math).
 */
export const zUsage = z.object({
    units: z.array(zMeasure),
    cost: zMonetaryValue.optional(),
    evidence: z.record(z.string(), zJson).optional(),
}).strict();
export type Usage = z.infer<typeof zUsage>;

/** A PER_CALL (or hookless) run consumes nothing countable — billing
 *  derives from the MODEL + success, not from a fake measure. */
export function defaultUsage(): Usage {
    return { units: [] };
}

/** Forced on vendor errors — unit-AGNOSTIC (a zero needs no unit): the
 *  run consumed nothing countable and bills nothing. */
export function zeroUsage(): Usage {
    return { units: [] };
}
