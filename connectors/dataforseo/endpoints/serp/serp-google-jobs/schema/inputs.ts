import { z } from "zod";
import { zDepth, zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/serp/google/jobs/task_post` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zSerpGoogleJobsBody = z.object({
    keyword: z.string().min(1).max(700).describe(
        "Search query, up to 700 characters.",
    ),
    ...zLocaleFields,
    depth: zDepth(200, 10, 10),
    location_radius: z.string().min(1).describe(
        "Location search radius",
    ).optional(),
    employment_type: z.array(z.string().min(1)).describe(
        "Employment contract type (values: fulltime, partime, contractor, intern)",
    ).optional(),
}).strict();
