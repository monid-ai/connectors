import { z } from "zod";
import { zJson } from "../json/type.ts";
import { Unit, zMeasure } from "./unit.ts";
import { zMonetaryValue } from "./monetary.ts";

/**
 * The `usage` half of the settle fn (`usage.consolidate`) result, validated
 * at runtime (FN_CONTRACT on mismatch):
 * `units` = billable quantity in vendor-NATIVE units (what monid pricing
 * multiplies); `cost` = the vendor's OWN reported price, READ from the
 * response (never computed by us), as a MonetaryValue (micro-dollar canon);
 * `evidence` = audit receipts (raw values kept for invoices/debugging, not math).
 */
export const zUsage = z.object({
    units: z.array(zMeasure).min(1),
    cost: zMonetaryValue.optional(),
    evidence: z.record(z.string(), zJson).optional(),
}).strict();
export type Usage = z.infer<typeof zUsage>;

/** Default when an endpoint declares no compute. */
export function defaultUsage(outputPresent: boolean): Usage {
    return { units: [{ amount: outputPresent ? 1 : 0, unit: Unit.CALL }] };
}

/** Forced on vendor errors — a failed call is never billed (compute never runs). */
export function zeroUsage(): Usage {
    return { units: [{ amount: 0, unit: Unit.CALL }] };
}
