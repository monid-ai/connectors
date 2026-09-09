import { z } from "zod";
import { zRunInput } from "../run/input.ts";
import { zUsageModel } from "../usage/model/mod.ts";
import { zUsage } from "../usage/usage.ts";
import { fnCarrier, zFnUtils, zHookLogger } from "./ctx.ts";

/**
 * HOOK usage.estimate — the PRE-RUN cost estimate (v1
 * `paymentLifecycle.estimate`): validated caller input → an estimated
 * `Usage` with the SAME `counts` keys `usage.consolidate` settles in (the
 * admission hold is priced from it by the host; settle trues it up
 * key-by-key). PURE + sync like the other non-lifecycle hooks — no IO, no
 * state, INPUT-only: the estimate is the settle's promise, made before
 * the vendor is touched (engine-executed via `estimate(runInput)`).
 *
 * Absent ⇒ the engine defaults to `{counts: {}}` — a flat doc needs no
 * estimate, the model + success is its whole story (design D18/D19). The
 * common input-derived shapes ship as presets (`presets.estimate.*` — the
 * v1 EstimationLabel machinery: onePerQuery, limitIsExact, perQueryLimit,
 * limitIsPages, dualLimit).
 *
 * `model` mirrors the envelope ctx: the doc's own usage.model, so generic
 * presets derive their counts KEY (leaf → unit, composite → the sole
 * metered component id) without per-doc arguments.
 */
export const zEstimateData = z.strictObject({
    input: zRunInput,
    model: zUsageModel,
});
export type EstimateData = z.infer<typeof zEstimateData>;

export const zEstimateCtx = z.object({
    data: zEstimateData,
    utils: zFnUtils,
    logger: zHookLogger,
});

export const UsageEstimateContract = z.function({
    input: [zEstimateCtx],
    output: zUsage,
});
export type UsageEstimateFn = z.infer<typeof UsageEstimateContract>;
export const zUsageEstimateFn = fnCarrier<UsageEstimateFn>(
    "a usage.estimate fn",
);
