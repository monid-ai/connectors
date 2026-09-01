import { z } from "zod";
import { zFnId } from "../common/ids.ts";
import { fnKeysOf, zEndpointDoc } from "../endpoint/doc.ts";
import { type FnEntry, zFnEntry } from "../fn-table/entry.ts";
import type { Bundle } from "./bundle.ts";

/**
 * SEALED UNIT ≠ EndpointDoc: the doc's slots hold `$fn` HASH REFERENCES, not
 * code — a doc alone cannot execute. A sealed unit is the doc PLUS exactly
 * the fn source entries it references: the statically-linked binary to the
 * doc's program-with-imports. Callers pass it BY VALUE into any engine —
 * another process, the hosted worker — and it executes with no other data.
 */
export const zSealedUnit = z.strictObject({
    doc: zEndpointDoc,
    fns: z.record(zFnId, zFnEntry),
});
export type SealedUnit = z.infer<typeof zSealedUnit>;

/** Build a sealed unit for one endpoint out of a bundle (O(1) map lookup). */
export function sealUnit(bundle: Bundle, endpointId: string): SealedUnit {
    const doc = bundle.endpoints[endpointId];
    if (!doc) throw new Error(`endpoint not in bundle: ${endpointId}`);
    const fns: Record<string, FnEntry> = {};
    for (const key of fnKeysOf(doc)) {
        const entry = bundle.fnTable[key];
        if (!entry) {
            throw new Error(`bundle missing fn entry ${key} for ${endpointId}`);
        }
        fns[key] = entry;
    }
    return { doc, fns };
}
