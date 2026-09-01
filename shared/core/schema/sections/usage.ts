import { z } from "zod";
import { zUsageConsolidateFn } from "../hooks/mod.ts";

/**
 * Usage section — SHARED by EndpointDef and ProviderDef (leaf-wise fallback):
 *   - `consolidate`: THE settle fn — RAW envelope → {usage, output?}:
 *     structured billing facts extracted, and the vendor's billing fields
 *     absorbed out of the payload in the same move (output absent =
 *     unchanged). Must RESOLVE for every endpoint (endpoint ?? provider —
 *     compile error if neither; use presets.usage.perCall() for flat
 *     billing). Runs BEFORE fromResponse, engine-executed for every
 *     operator.
 */
export const zUsageSection = z.strictObject({
    consolidate: zUsageConsolidateFn.optional(),
});
export type UsageSection = z.infer<typeof zUsageSection>;
