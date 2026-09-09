import { z } from "zod";
import { zJson } from "../json/type.ts";
import { zMonetaryValue } from "./monetary.ts";

/**
 * The `usage` half of the settle fn (`usage.consolidate`) result, validated
 * at runtime (FN_CONTRACT on mismatch):
 * `counts` = COUNTED billable quantities as a plain keyed map — ONE simple
 * shape for every model type (design D19). The key names WHAT is counted:
 *   - COMPOSITE doc  → the component id (metered components only; a flat
 *     component never appears — model + success covers it);
 *   - leaf PER_UNIT  → ONE implied key, the model's unit ({"RESULT": 10});
 *   - PER_CALL / error settle → {} — the canonical "nothing counted".
 * The same key indexes the broker card row, the drift-guard event and (for
 * apify) the vendor's own charge-event name — counts, card and vendor
 * truth join on one string, so per-event prices match exactly.
 * `cost` = the vendor's OWN reported price, READ from the response (never
 * computed by us), as a MonetaryValue (micro-dollar canon);
 * `evidence` = audit receipts (raw values kept for invoices/debugging, not math).
 */
export const zUsage = z.object({
    counts: z.record(z.string().min(1), z.number().nonnegative()),
    /** This run bills NOTHING (design D25). Canonical free shape:
     *  `{counts: {}, free: true}` — empty counts ride WITH the flag, no
     *  cost. REQUIRED from both fns on a FREE-model doc (free-ness is
     *  triple-stated: model + estimate + consolidate); a consolidate on a
     *  billed model MAY settle it dynamically (the vendor demonstrably
     *  charged nothing — evidence-backed). It suppresses the engine's
     *  flat-1s completion: a free run never bills the base fee. Error
     *  settles stay zeroUsage() WITHOUT the flag — failed ≠ free. */
    free: z.literal(true).optional(),
    cost: zMonetaryValue.optional(),
    evidence: z.record(z.string(), zJson).optional(),
}).strict();
export type Usage = z.infer<typeof zUsage>;

/** A PER_CALL (or hookless) run consumes nothing countable — billing
 *  derives from the MODEL + success, not from a fake count. */
export function defaultUsage(): Usage {
    return { counts: {} };
}

/** Forced on vendor errors — the run consumed nothing countable and
 *  bills nothing. */
export function zeroUsage(): Usage {
    return { counts: {} };
}
