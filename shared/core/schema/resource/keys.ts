import { z } from "zod";
import { zPath } from "../json/path.ts";

/**
 * LOOKUP KEYS — the declared, named ways to find an owned resource by
 * something other than its `externalId` (design D48).
 *
 * The problem: a resource is routinely known by more than one id. A
 * Saperly number is the vendor uuid to `/place-calls` and the E.164 to a
 * `call.received` webhook (whose payload carries NO uuid). One of those
 * is the ownership key; the other is, today, unresolvable.
 *
 * monid-services solves this with `aliasExternalIds: string[]` on the
 * row, filled by a per-type factory. That works, but the array is
 * ANONYMOUS: nothing says what an entry means, a key cannot be retired,
 * and adding a second kind of alias edits a factory.
 *
 * Here the DEF declares them instead, by NAME, as paths into the
 * resource's own `data` snapshot:
 *
 *     keys: { e164: "$.phoneNumber" }
 *
 * The host resolves each path when it persists a row and indexes the
 * result, so `+14155550123` and the uuid both find the same resource.
 * Named, additive (a new key is a def-level edit), retirable (drop the
 * entry and its index rows stop being written), and debuggable (an index
 * dump says WHICH key matched).
 *
 * `externalId` remains the PRIMARY key and the only thing a resource is
 * addressed by cross-doc (`zResourceTarget`); lookup keys are an index
 * INTO it, never a second identity.
 */

/** A key's name — snake_case, its own label in the index and in errors. */
export const zLookupKeyName = z.string().regex(
    /^[a-z][a-z0-9_]*$/,
    "lookup key name must be lowercase snake_case",
);
export type LookupKeyName = z.infer<typeof zLookupKeyName>;

/**
 * DEF side: name → restricted JSONPath into the instance's `data`.
 * Rooted at the data snapshot (NOT the vendor envelope) so a `refresh`
 * that rewrites data re-derives the same keys — an index can never
 * describe a field the row no longer has.
 */
export const zResourceLookupKeys = z.record(zLookupKeyName, zPath);
export type ResourceLookupKeys = z.infer<typeof zResourceLookupKeys>;

/** ROW side: name → the resolved value. A path that reads nothing (a
 *  degraded provision with no phoneNumber yet) is simply ABSENT — a
 *  missing key is never an error, it is a resource you can only address
 *  by its externalId until a refresh fills it in. */
export const zResolvedLookupKeys = z.record(
    zLookupKeyName,
    z.string().min(1),
);
export type ResolvedLookupKeys = z.infer<typeof zResolvedLookupKeys>;
