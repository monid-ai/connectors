import { z } from "zod";
import { zDepth, zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/serp/google/dataset_search/live/advanced` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zSerpGoogleDatasetSearchBody = z.object({
    keyword: z.string().min(1).max(700).describe(
        "Search query, up to 700 characters.",
    ),
    ...zLocaleFields,
    depth: zDepth(200, 20, 20),
    device: z.string().min(1).describe("Device type").optional(),
    os: z.string().min(1).describe(
        "Device operating system (default windows)",
    ).optional(),
    last_updated: z.string().min(1).describe(
        "Last time the dataset was updated (values: 1m, 1y, 3y)",
    ).optional(),
    file_formats: z.array(z.string().min(1)).describe(
        "File formats of the dataset (values: other, archive, text, image, document, tabular)",
    ).optional(),
    usage_rights: z.string().min(1).describe(
        "Usage rights of the dataset (values: commercial, noncommercial)",
    ).optional(),
    is_free: z.boolean().describe(
        "Indicates whether displayed datasets are free (values: true, false)",
    ).optional(),
    topics: z.array(z.string().min(1)).describe(
        "Dataset topics (values: humanities, social_sciences, life_sciences, agriculture, natural_sciences, geo, computer, architecture_and_urban_planning, engineering)",
    ).optional(),
}).strict();
