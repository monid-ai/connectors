import { z } from "zod";

/**
 * Request body of `POST /v3/domain_analytics/technologies/domain_technologies/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zDomainDomainTechnologiesBody = z.object({
    target: z.string().min(1).max(255).describe(
        "Domain to profile, without https:// or www, e.g. 'example.com'.",
    ),
}).strict();
