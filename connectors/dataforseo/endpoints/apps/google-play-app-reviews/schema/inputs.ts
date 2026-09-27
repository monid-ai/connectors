import { z } from "zod";
import { zDepth, zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/app_data/google/app_reviews/task_post` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zGooglePlayAppReviewsBody = z.object({
    app_id: z.string().min(1).describe(
        "Google Play app id, e.g. 'com.spotify.music'.",
    ),
    ...zLocaleFields,
    depth: zDepth(3000, 150, 150),
    rating: z.number().int().describe("Filter reviews by rating").optional(),
    sort_by: z.string().min(1).describe(
        "Results sorting parameters",
    ).optional(),
}).strict();
