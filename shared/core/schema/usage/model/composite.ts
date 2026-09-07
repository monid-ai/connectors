import { z } from "zod";
import { PER_CALL_MODEL_KIND } from "./per-call.ts";
import { PER_UNIT_MODEL_KIND } from "./per-unit.ts";
import { zScalarUsageModel } from "./scalar.ts";

export const COMPOSITE_MODEL_KIND = "COMPOSITE" as const;

/**
 * AND — the SUM of scalar components: all bill on the same run (e.g. the
 * verified apify actor-start fee AND per-item metering:
 * `[PER_CALL, PER_UNIT·RESULT]`). The hosted rate card prices one row per
 * component and sums. Constraints: at most one PER_CALL component (two
 * flat fees are one flat fee — the card holds the total); PER_UNIT
 * components carry DISTINCT units (each unit priced once); components are
 * SCALARS only — no nesting (the v1 leaf rule).
 */
export const zCompositeModel = z.strictObject({
    kind: z.literal(COMPOSITE_MODEL_KIND),
    components: z.array(zScalarUsageModel).min(2),
}).superRefine((model, ctx) => {
    const perCalls = model.components
        .filter((component) => component.kind === PER_CALL_MODEL_KIND)
        .length;
    if (perCalls > 1) {
        ctx.addIssue({
            code: "custom",
            message: "at most one PER_CALL component",
        });
    }
    const units = model.components
        .filter((component) => component.kind === PER_UNIT_MODEL_KIND)
        .map((component) => (component as { unit: string }).unit);
    if (new Set(units).size !== units.length) {
        ctx.addIssue({
            code: "custom",
            message: "PER_UNIT components must have distinct units",
        });
    }
});
export type CompositeModel = z.infer<typeof zCompositeModel>;
