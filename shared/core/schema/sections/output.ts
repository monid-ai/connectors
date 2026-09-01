import { z } from "zod";
import { zOutputFromResponseFn, zSchemaCarrier } from "../hooks/mod.ts";

/**
 * Output section — SHARED by EndpointDef and ProviderDef (leaf-wise fallback):
 *   - `fromResponse`: raw decoded response → the user-facing output (CSV →
 *     rows, reshaping, honest field removal — visible in the doc, same for
 *     ALL callers; there is no host-gated redaction in this standard).
 *     Endpoint hook REPLACES the provider's.
 *   - `schema`: validates the FINAL user-facing output, i.e. AFTER
 *     fromResponse. The raw vendor payload is never schema-checked (usage
 *     reads it; fromResponse reshapes it).
 *
 * There is no decode flag: the engine sniffs — JSON if the body parses, else
 * the faithful raw string (a string is valid Json).
 */
export const zOutputSection = z.strictObject({
    fromResponse: zOutputFromResponseFn.optional(),
    schema: zSchemaCarrier.optional(),
});
export type OutputSection = z.infer<typeof zOutputSection>;
