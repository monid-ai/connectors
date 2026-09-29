import { z } from "zod";
import { zJson } from "./../json/type.ts";
import { zResourceId } from "./ids.ts";
import { zResourceType } from "./type.ts";
import { zResolvedLookupKeys } from "./keys.ts";

/**
 * An OWNED RESOURCE instance as the host serves it back (design D41 —
 * renamed from `ResourceRow`: fn-facing, not backend-facing). The story
 * is symmetric with the def: the def declares a `data` schema, an owned
 * instance carries `.data`. Host-owned fields (workspace, billing
 * schedule, events) never appear: the engine and the fns see exactly
 * what the doc declared.
 */
export const zOwnedResource = z.strictObject({
    resource: zResourceId,
    externalId: z.string().min(1),
    /** The generic kind, copied from the doc at persist (design D48) —
     *  so a store can group/filter rows without loading the bundle.
     *  OPTIONAL: a hand-written fixture window (`engine:run
     *  --resources`) should not have to restate what the def knows. */
    type: zResourceType.optional(),
    /** The human/agent-facing handle (the E.164, the mailbox address) —
     *  what a CLI shows and a person recognises. Defaults to
     *  `externalId` host-side; OPTIONAL here for the same fixture
     *  reason. NEVER an address: `externalId` + `keys` are. */
    identifier: z.string().min(1).optional(),
    /** Resolved NAMED lookups (design D48) — the values the host indexed
     *  so this resource also answers to them. Mirrors the doc's `keys`
     *  declaration; absent when the def declares none or nothing
     *  resolved. */
    keys: zResolvedLookupKeys.optional(),
    /** The `data`-schema snapshot (validated by the engine against the
     *  doc's data schema on the way IN — defense against host drift). */
    data: zJson,
    syncedAt: z.iso.datetime().optional(),
});
export type OwnedResource = z.infer<typeof zOwnedResource>;
