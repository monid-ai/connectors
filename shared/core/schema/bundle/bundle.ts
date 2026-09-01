import { z } from "zod";
import {
    zEndpointId,
    zFnId,
    zProviderName,
    zSemverString,
} from "../common/ids.ts";
import { fnKeysOf, zEndpointDoc } from "../endpoint/doc.ts";
import { zProviderDoc } from "../provider/doc.ts";
import { zFnEntry } from "../fn-table/entry.ts";
import { zTaxonomy } from "../taxonomy/leaf.ts";

/**
 * The compiled bundle — ONE atomic artifact the hosted Catalog ingests in one
 * transaction: docs + fnTable (exact closure of all $fn keys) + taxonomy +
 * toolchain provenance.
 *
 * `providers` and `endpoints` are MAPS keyed by name/id (matching fnTable):
 * a duplicate id cannot even be REPRESENTED (uniqueness by construction),
 * and `sealUnit(bundle, id)` is an O(1) lookup. The accepted cost: the key
 * duplicates `doc.id`/`doc.name` (docs keep their identity because sealed
 * units travel self-contained), so superRefine checks key==identity.
 * Determinism is unaffected — the compiler inserts in sorted order (JSON
 * serializes object keys in insertion order) and RFC 8785 hashing sorts keys
 * regardless.
 *
 * Cross-doc invariants live HERE as superRefine (zod-delegated), so any
 * consumer that parses a bundle re-validates them for free:
 *   - map key == doc identity (id / name)
 *   - fnTable closure: every referenced $fn key present; no orphan entries
 *   - taxonomy membership consistent (leaf ids exist; endpoint ids exist)
 */
export const zBundle = z.strictObject({
    catalogVersion: z.string().min(1),
    generatedAt: z.string().min(1),
    /** Max over all docs — the whole-bundle admission gate. */
    minEngineVersion: zSemverString,
    /** Provenance, NEVER a gate (engine gates on minEngineVersion + specVersion only). */
    toolchain: z.strictObject({
        compilerVersion: zSemverString,
        builtWithEngineVersion: zSemverString,
    }),
    providers: z.record(zProviderName, zProviderDoc),
    endpoints: z.record(zEndpointId, zEndpointDoc),
    /** Leaf registry + endpoint membership (closed vocabulary; hosted side shelves). */
    taxonomy: zTaxonomy,
    fnTable: z.record(zFnId, zFnEntry),
}).superRefine((bundle, ctx) => {
    // map key == doc identity
    for (const [name, provider] of Object.entries(bundle.providers)) {
        if (provider.name !== name) {
            ctx.addIssue({
                code: "custom",
                message:
                    `providers["${name}"] holds doc with name "${provider.name}"`,
            });
        }
    }
    for (const [id, doc] of Object.entries(bundle.endpoints)) {
        if (doc.id !== id) {
            ctx.addIssue({
                code: "custom",
                message: `endpoints["${id}"] holds doc with id "${doc.id}"`,
            });
        }
    }
    // fnTable closure — both directions
    const docs = Object.values(bundle.endpoints);
    const referenced = new Set(docs.flatMap((doc) => fnKeysOf(doc)));
    for (const key of referenced) {
        if (!bundle.fnTable[key]) {
            ctx.addIssue({
                code: "custom",
                message: `fnTable missing entry: ${key}`,
            });
        }
    }
    for (const key of Object.keys(bundle.fnTable)) {
        if (!referenced.has(key)) {
            ctx.addIssue({
                code: "custom",
                message: `fnTable orphan entry: ${key}`,
            });
        }
    }
    // taxonomy membership consistency
    const leafIds = new Set(bundle.taxonomy.leaves.map((leaf) => leaf.id));
    for (
        const [leafId, members] of Object.entries(bundle.taxonomy.membership)
    ) {
        if (!leafIds.has(leafId)) {
            ctx.addIssue({
                code: "custom",
                message: `membership references unknown leaf: ${leafId}`,
            });
        }
        for (const endpointId of members) {
            if (!bundle.endpoints[endpointId]) {
                ctx.addIssue({
                    code: "custom",
                    message:
                        `membership references unknown endpoint: ${endpointId}`,
                });
            }
        }
    }
});
export type Bundle = z.infer<typeof zBundle>;
