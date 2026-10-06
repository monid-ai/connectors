import { z } from "zod";

export const zEnrichPathParams = z.strictObject({
    profile_id: z.string().min(1).describe(
        "An Orbit profile id, an alias id, or a public slug.",
    ),
});

/**
 * `POST /v3/enrich/{profile_id}` body — the faithful mirror of the published
 * v3 `EnrichRequest` (design D25). `include_profile`'s vendor default (true)
 * is applied at the binding.
 *
 * STRICT, like Orbit's published schema. `request_id` is intentionally NOT
 * EXPOSED: Orbit lets it override the `Idempotency-Key` header and scopes it
 * per API key, which on a broker is one namespace shared by every caller.
 * The engine's run-stable `Idempotency-Key` is the idempotency identity.
 */
export const zEnrichBody = z.strictObject({
    operation: z.enum(["partial", "full", "regenerate"]).describe(
        "`partial` builds a useful profile, `full` builds the deepest " +
            "profile Orbit can, and `regenerate` rebuilds a fresh full " +
            "profile from current sources.",
    ),
    include_profile: z.boolean().describe(
        "Embed the profile in the response once it is available.",
    ).optional(),
});
