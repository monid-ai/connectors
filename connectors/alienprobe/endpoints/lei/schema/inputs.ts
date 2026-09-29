import { z } from "zod";

/**
 * GET /v1/lookup/lei query params — mirrored from the seller's live
 * OpenAPI (`lookup_lei_by_query`, read 2026-09-29). The path form
 * `/v1/lookup/lei/{lei}` is the same door at the same price; the
 * connector speaks the query form only.
 */
export const zAlienprobeLeiQueryParams = z.object({
    lei: z.string().regex(/^[0-9A-Z]{20}$/).describe(
        "The 20-character ISO 17442 Legal Entity Identifier to resolve, " +
            "uppercase. A bad ISO 7064 check digit is refused free (400).",
    ),
}).strict();
