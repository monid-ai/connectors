import { z } from "zod";
import { zJson } from "../json/type.ts";
import { zRunInput } from "../run/input.ts";
import {
    fnCarrier,
    zFnUtils,
    zHookLogger,
    zOutputByConstruction,
} from "./ctx.ts";

/**
 * HOOKS output.fromResponse + output.fromError — the two presentation
 * projections, sharing ONE contract shape (envelope in, Json out; returns
 * FN_CONTRACT-validated — the "transform must guarantee JSON" rule):
 *
 *   - `fromResponse`: consolidated SUCCESS response → the user-facing
 *     output (CSV → rows, reshaping).
 *   - `fromError`: vendor PROVIDER-ERROR envelope → a digestible error
 *     shape (design D12 — v1's per-call-site `apifyErrorBody` normalization
 *     as ONE hook). Runs ONLY on provider-error results, AFTER zero-usage
 *     forcing (structurally cannot touch a bill); absent ⇒ the raw body
 *     passes through. Convention: keep the raw body under a `raw` key —
 *     digest, never hide. `output.schema` applies to fromResponse output
 *     only (success shape), never to error projections.
 *
 * The envelope data shape is shared with usage.consolidate.
 */

/** ctx.data for post-response hooks — the validated input + decoded output.
 *  `state` is present only for lifecycle (async) runs: the final threaded
 *  state, so settle fns can read billing signals stashed during polling
 *  (e.g. Apify's pricing fields ride the poll response, not the dataset). */
export const zEnvelopeData = z.strictObject({
    input: zRunInput,
    output: zOutputByConstruction,
    state: zJson.optional(),
});
export type EnvelopeData = z.infer<typeof zEnvelopeData>;

export const zEnvelopeCtx = z.object({
    data: zEnvelopeData,
    utils: zFnUtils,
    logger: zHookLogger,
});

export const OutputFromResponseContract = z.function({
    input: [zEnvelopeCtx],
    output: zJson,
});
export type OutputFromResponseFn = z.infer<typeof OutputFromResponseContract>;
export const zOutputFromResponseFn = fnCarrier<OutputFromResponseFn>(
    "an output.fromResponse fn",
);

/** Same contract shape, its own carrier (a def field must name its hook). */
export const OutputFromErrorContract = OutputFromResponseContract;
export type OutputFromErrorFn = OutputFromResponseFn;
export const zOutputFromErrorFn = fnCarrier<OutputFromErrorFn>(
    "an output.fromError fn",
);
