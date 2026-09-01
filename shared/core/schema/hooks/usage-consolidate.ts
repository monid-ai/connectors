import { z } from "zod";
import { zJson } from "../json/type.ts";
import { zUsage } from "../usage/usage.ts";
import { fnCarrier } from "./ctx.ts";
import { zEnvelopeCtx } from "./from-response.ts";

/**
 * HOOK usage.consolidate — THE settle fn: RAW envelope →
 *
 *     { usage: Usage, output?: Json }
 *
 * One total job with two halves that share one piece of knowledge (where the
 * vendor's billing info lives): EXTRACT the structured usage
 * ({units, cost?, evidence?}) and ABSORB those billing fields out of the
 * payload — like a parser returning {value, rest}. `output` ABSENT means
 * "unchanged" (zero boilerplate when there is nothing to remove — presets
 * like usage.perCall return {usage} only).
 *
 * Must RESOLVE for every endpoint (endpoint ?? provider — compile error if
 * neither): every endpoint must be able to settle. Runs on the RAW envelope
 * BEFORE fromResponse — billing truth anchors to the wire response, so a
 * presentation change can never silently change a bill (facts before
 * presentation; fromResponse gets the cleaned output and touches only domain
 * data). Vendor error ⇒ zero usage forced (the hook never runs).
 */
export const zConsolidated = z.strictObject({
    usage: zUsage,
    /** The response with billing fields absorbed; absent = unchanged. */
    output: zJson.optional(),
});
export type Consolidated = z.infer<typeof zConsolidated>;

export const UsageConsolidateContract = z.function({
    input: [zEnvelopeCtx],
    output: zConsolidated,
});
export type UsageConsolidateFn = z.infer<typeof UsageConsolidateContract>;
export const zUsageConsolidateFn = fnCarrier<UsageConsolidateFn>(
    "a usage.consolidate fn",
);
