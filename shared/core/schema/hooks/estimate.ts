import { z } from "zod";
import { zRunInput } from "../run/input.ts";
import { zUsage } from "../usage/usage.ts";
import { fnCarrier, zFnUtils, zHookLogger } from "./ctx.ts";

/**
 * HOOK usage.estimate — the PRE-RUN cost estimate (v1
 * `paymentLifecycle.estimate`): validated caller input → an estimated
 * `Usage` in the SAME units `usage.consolidate` settles in (the admission
 * hold is priced from it by the host; settle trues it up). PURE + sync
 * like the other non-lifecycle hooks — no IO, no state, engine-executed
 * via `estimate(runInput)` without touching the vendor.
 *
 * Absent ⇒ the engine defaults to one CALL unit (v1
 * `estimateCostFromPrice`'s PER_CALL base). The common input-derived
 * shapes ship as presets (`presets.estimate.*` — the v1 EstimationLabel
 * machinery: onePerQuery, limitIsExact, perQueryLimit, limitIsPages,
 * dualLimit, perCall).
 */
export const zEstimateData = z.strictObject({
    input: zRunInput,
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
