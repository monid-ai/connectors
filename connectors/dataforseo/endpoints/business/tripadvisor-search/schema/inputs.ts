import { z } from "zod";
import { zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/business_data/tripadvisor/search/task_post` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zTripadvisorSearchBody = z.object({
    keyword: z.string().min(1).describe("Keyword"),
    ...zLocaleFields,
    depth: z.number().int().min(1).max(210).describe(
        "Parsing depth (default 30; max 210)",
    ).optional(),
}).strict();
