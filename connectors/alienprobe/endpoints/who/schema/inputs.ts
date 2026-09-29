import { z } from "zod";

/**
 * GET /v1/lookup/who query params — mirrored from the seller's live
 * OpenAPI (`lookup_who_by_query`, read 2026-09-29). The path form
 * `/v1/lookup/who/{q}` is the same door at the same price; the connector
 * speaks the query form only.
 */
export const zAlienprobeWhoQueryParams = z.object({
    q: z.string().min(1).max(200).describe(
        "A company legal name (optionally suffixed `;JURISDICTION`, e.g. " +
            "`Apple Inc.;US-CA`), a registrable domain (apple.com — a " +
            "subdomain misses), or a 20-character LEI; 1 to 200 characters.",
    ),
}).strict();
