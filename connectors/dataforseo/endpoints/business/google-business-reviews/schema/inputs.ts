import { z } from "zod";
import { zDepth, zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/business_data/google/reviews/task_post` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zGoogleBusinessReviewsBody = z.object({
    keyword: z.string().min(1).max(700).describe(
        "Business name, ideally with city; required unless cid or place_id is given.",
    ).optional(),
    cid: z.string().min(1).max(40).describe(
        "Google Maps cid of the business (from google-maps or google-business-info); alternative to keyword.",
    ).optional(),
    place_id: z.string().min(1).max(200).describe(
        "Google place_id of the business; alternative to keyword.",
    ).optional(),
    ...zLocaleFields,
    depth: zDepth(4490, 10, 10),
    sort_by: z.string().min(1).describe(
        "Results sorting parameters (default relevant)",
    ).optional(),
}).strict();
