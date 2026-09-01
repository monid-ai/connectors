import { z } from "zod";
import { zJson } from "../json/type.ts";
import { zRunInput } from "../run/input.ts";
import { fnCarrier, zFnUtils, zOutputByConstruction } from "./ctx.ts";

/**
 * HOOK output.fromResponse — consolidated response → the user-facing output
 * (CSV → rows, reshaping). Its return is FN_CONTRACT-validated as Json — the
 * "transform must guarantee JSON" rule.
 *
 * The envelope data shape is shared with usage.compute and usage.consolidate
 * (all three read {input, output}).
 */

/** ctx.data for post-response hooks — the validated input + decoded output. */
export const zEnvelopeData = z.strictObject({
    input: zRunInput,
    output: zOutputByConstruction,
});
export type EnvelopeData = z.infer<typeof zEnvelopeData>;

export const zEnvelopeCtx = z.object({ data: zEnvelopeData, utils: zFnUtils });

export const OutputFromResponseContract = z.function({
    input: [zEnvelopeCtx],
    output: zJson,
});
export type OutputFromResponseFn = z.infer<typeof OutputFromResponseContract>;
export const zOutputFromResponseFn = fnCarrier<OutputFromResponseFn>(
    "an output.fromResponse fn",
);
