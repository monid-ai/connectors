import { z } from "zod";
import { zDepth, zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/app_data/apple/app_searches/task_post` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zAppStoreSearchBody = z.object({
    keyword: z.string().min(1).describe("Keyword"),
    ...zLocaleFields,
    depth: zDepth(700, 100, 100),
}).strict();
