import { z } from "zod";
import { zUsageConsolidateFn, zUsageEstimateFn } from "../hooks/mod.ts";
import { zCredits, zUsageModel } from "../usage/model/mod.ts";

/**
 * Usage section — SHARED by EndpointDef and ProviderDef (leaf-wise fallback):
 *   - `consolidate`: THE settle fn — RAW envelope → {usage, output?}:
 *     structured billing facts extracted, and the vendor's billing fields
 *     absorbed out of the payload in the same move (output absent =
 *     unchanged). Must RESOLVE for every endpoint (endpoint ?? provider —
 *     compile error if neither; use presets.usage.perCall() for flat
 *     billing). Runs BEFORE fromResponse, engine-executed for every
 *     operator.
 *   - `model`: the RATE-FREE billing-shape declaration (usage/model/) —
 *     inline DATA on the compiled doc (never a fn), so catalogs can price
 *     without executing anything. Must RESOLVE for every endpoint
 *     (endpoint ?? provider — compile error if neither): every doc
 *     declares what is chargeable.
 *   - `estimate`: the PRE-RUN estimate hook (hooks/estimate.ts) —
 *     validated input → estimated Usage with consolidate's counts keys.
 *     Absent ⇒ the engine defaults to `{counts: {}}`.
 */
export const zUsageSection = z.strictObject({
    consolidate: zUsageConsolidateFn.optional(),
    model: zUsageModel.optional(),
    /** The credit systems this endpoint drains (design D26) — declared
     *  INDEPENDENTLY of the rate card, resolving provider ?? endpoint (a
     *  provider declares its pool ONCE; single-pool providers name it
     *  `default`). Every billable line's `consumes.credit` must reference
     *  a resolved id (compile-checked). FREE docs need none. */
    credits: zCredits.optional(),
    estimate: zUsageEstimateFn.optional(),
});
export type UsageSection = z.infer<typeof zUsageSection>;
