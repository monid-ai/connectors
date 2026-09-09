import { z } from "zod";

/**
 * What FNS return (design D26): typed QUANTITIES only — one entry per
 * metered rate-card line (a composite's PER_UNIT line ids / a leaf
 * PER_UNIT's unit). No rate math, no receipts: flat lines are
 * engine-appended, the credits fold is engine-owned, and vendor billing
 * fields live in the RAW run record (hosts persist the raw envelope —
 * the receipt IS the output).
 */
export const zFnUsage = z.object({
    counts: z.record(z.string().min(1), z.number().nonnegative()),
}).strict();
export type FnUsage = z.infer<typeof zFnUsage>;

/**
 * The PUBLIC usage (design D26) — exactly two facts, both re-derivable
 * and broker-generic:
 *   1. `credits`  — how many credits consumed, per declared credit
 *      system: the priced vector (broker: credits[id] × card row).
 *   2. `evidence` — WHY: one entry per rate-card line (units consumed
 *      for PER_UNIT lines, 1 for PER_CALL lines — engine-appended).
 *      Anyone holding the DOC re-derives credits from evidence × the
 *      model's every/amount: the bill is checkable from public facts.
 * Assembled by the ENGINE (fn quantities + flat 1s → fold through the
 * doc's rate card). No third field: vendor receipts are the raw run
 * record's job, not usage's.
 */
export const zUsage = z.object({
    credits: z.record(z.string().min(1), z.number().nonnegative()),
    evidence: z.record(z.string().min(1), z.number().nonnegative()),
}).strict();
export type Usage = z.infer<typeof zUsage>;

/** A hookless/absent-estimate fn consumed nothing countable. */
export function defaultFnUsage(): FnUsage {
    return { counts: {} };
}

/** Forced on vendor errors — the run billed nothing (and a FREE run's
 *  success settles the same shape: the MODEL is the free fact). */
export function zeroUsage(): Usage {
    return { credits: {}, evidence: {} };
}
