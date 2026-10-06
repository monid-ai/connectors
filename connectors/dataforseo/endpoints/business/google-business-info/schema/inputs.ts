import { z } from "zod";
import { zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/business_data/google/my_business_info/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zGoogleBusinessInfoBody = z.object({
    keyword: z.string().min(1).max(700).describe(
        "Business name, ideally with city, e.g. 'Starbucks Times Square'.",
    ),
    ...zLocaleFields,
}).strict();
