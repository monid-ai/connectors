import { z } from "zod";
import { zUnit } from "../unit.ts";
import { zModelSelector } from "./selector.ts";

export const VARIANT_MODEL_KIND = "VARIANT" as const;

/**
 * SELECT (exclusive OR) — a variant-priced unit: the SAME quantity, whose
 * card row is selected by request coordinates (resolution=4k vs 1080p).
 * NOT a composite: a sum has all children active; a select has exactly
 * one. v1's PER_UNIT_MATRIX minus the rate table — rate-free docs carry
 * selection, not a matrix, and v1's own rows were already named
 * `variants`. Unmatched coordinates ⇒ unpriceable ⇒ admission rejects
 * (the v1 MatrixUnmatchedError posture, enforced host-side).
 */
export const zVariantModel = z.strictObject({
    kind: z.literal(VARIANT_MODEL_KIND),
    unit: zUnit,
    selectors: z.array(zModelSelector).min(1),
});
export type VariantModel = z.infer<typeof zVariantModel>;
