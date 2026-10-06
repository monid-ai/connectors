import { z } from "zod";
import { zCountryLocaleFields, zKeywords } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/keywords_data/bing/keyword_performance/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zKeywordsBingKeywordPerformanceBody = z.object({
    keywords: zKeywords(1000),
    device: z.string().min(1).describe(
        "Device type (default all; values: desktop, mobile, tablet, all)",
    ).optional(),
    match: z.string().min(1).describe("Keywords match type").optional(),
    ...zCountryLocaleFields,
}).strict();
