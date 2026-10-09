import { z } from "zod";

/**
 * `POST /v3/enrich` body — the faithful mirror of the published v3
 * `BatchEnrichRequest` (design D25). `include_profile`'s vendor default
 * (true) is applied at the binding.
 *
 * STRICT, like Orbit's published schema. `request_id` is intentionally NOT
 * EXPOSED: Orbit lets it override the `Idempotency-Key` header and scopes it
 * per API key, which on a broker is one namespace shared by every caller.
 * The engine's run-stable `Idempotency-Key` is the idempotency identity.
 */
export const zBatchEnrichBody = z.strictObject({
    profile_ids: z.array(z.string().min(1)).min(1).max(20).describe(
        "1 to 20 Orbit profile ids or public slugs. Duplicates are " +
            "normalized before work starts.",
    ),
    operation: z.enum(["partial", "full", "regenerate"]).describe(
        "One operation, applied to every profile in the list.",
    ),
    include_profile: z.boolean().describe(
        "Embed each child's profile once it is available.",
    ).optional(),
});
