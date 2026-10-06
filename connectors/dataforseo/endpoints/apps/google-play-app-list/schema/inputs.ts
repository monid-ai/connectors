import { z } from "zod";
import { zDepth, zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/app_data/google/app_list/task_post` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zGooglePlayAppListBody = z.object({
    app_collection: z.string().min(1).describe("App collection"),
    ...zLocaleFields,
    depth: zDepth(200, 100, 100),
    app_category: z.string().min(1).describe(
        "Application category on Google Play",
    ).optional(),
    age_rating: z.string().min(1).describe(
        "Filter results by age rating",
    ).optional(),
}).strict();
