import { z } from "zod";

/**
 * Request body of `POST /v3/business_data/trustpilot/search/task_post` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zTrustpilotSearchBody = z.object({
    keyword: z.string().min(1).describe("Keyword"),
    depth: z.number().int().min(1).max(140).describe(
        "Parsing depth (default 10; max 140)",
    ).optional(),
}).strict();
