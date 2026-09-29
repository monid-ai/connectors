import { z } from "zod";

/**
 * The GENERIC resource type — the cross-provider axis of a resource's
 * identity (design D48).
 *
 * A resource is named twice, on purpose:
 *   - `id` ("<provider>/<slug>", e.g. "saperly/phone-number") is the
 *     UNIQUE def identity. It is provider-scoped by construction, so it
 *     can never answer "every phone number I own, whoever sells it".
 *   - `type` (this vocabulary, e.g. "phone_number") is the KIND. It is
 *     deliberately NOT unique: two providers renting phone numbers
 *     declare the same type, which is the entire point — a host, a CLI
 *     filter, or a future cross-provider view groups on it.
 *
 * A CLOSED vocabulary, and closed at exactly what this repo ships: one
 * entry per resource def in tree, added WITH the def. It is not a
 * forecast — an unused member is a promise the catalog cannot keep, and
 * the compiler rejects an undeclared type by construction.
 *
 * (monid-services carries the same two axes as `resourceType` +
 * `resourceSlug`; here the id already plays the slug's part, so only the
 * generic half is new.)
 */
export const ResourceType = {
    /** A rented phone number. Its AI persona (Saperly "connection") is a
     *  pointer the resource holds, never a resource of its own. */
    PHONE_NUMBER: "phone_number",
} as const;

export const zResourceType = z.enum(ResourceType);
export type ResourceType = z.infer<typeof zResourceType>;
