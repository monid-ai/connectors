import { z } from "zod";
import { zResourceId } from "./ids.ts";

/**
 * Resource ADDRESSING — the cross-doc address shape (dependency-leaf, no
 * hook imports) shared by resource lifecycle ops, endpoint bindings,
 * lifecycle utils (`utils.resources`) and webhook hooks.
 */

/** One owned resource, addressed by its doc id + the vendor's own id —
 *  used where addressing is genuinely CROSS-DOC (provision seeds,
 *  webhook routing, settle marks). Op fns never see one: they get the
 *  full OwnedResource instance instead (design D41). */
export const zResourceTarget = z.strictObject({
    /** Resource doc id — "<provider>/<slug>", SELF-DESCRIBING (a
     *  cross-provider ensure seed resolves its doc on the seed's own
     *  provider). */
    resource: zResourceId,
    /** The vendor's identifier (v1 externalId — the ownership-pointer
     *  key). */
    externalId: z.string().min(1),
});
export type ResourceTarget = z.infer<typeof zResourceTarget>;
