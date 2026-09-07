import { z } from "zod";
import { zUsageConsolidateFn, zUsageEstimateFn } from "../hooks/mod.ts";
import { zUsageModel } from "../usage/model/mod.ts";

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
 *     without executing anything.
 *   - `estimate`: the PRE-RUN estimate hook (hooks/estimate.ts) —
 *     validated input → estimated Usage in consolidate's units. Absent ⇒
 *     the engine defaults to one CALL unit.
 */
export const zUsageSection = z.strictObject({
    consolidate: zUsageConsolidateFn.optional(),
    model: zUsageModel.optional(),
    estimate: zUsageEstimateFn.optional(),
});
export type UsageSection = z.infer<typeof zUsageSection>;
