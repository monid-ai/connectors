import { z } from "zod";
import { zCountryLocaleFields, zKeywords } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/keywords_data/google_trends/explore/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zKeywordsGoogleTrendsExploreBody = z.object({
    keywords: zKeywords(5),
    ...zCountryLocaleFields,
    type: z.string().min(1).describe("Type").optional(),
    category_code: z.number().int().describe(
        "Google trends search category",
    ).optional(),
    date_from: z.iso.date().describe(
        "Starting date of the time range",
    ).optional(),
    date_to: z.iso.date().describe(
        "Ending date of the time range",
    ).optional(),
    time_range: z.string().min(1).describe("Preset time ranges").optional(),
    item_types: z.array(z.string().min(1)).describe(
        "Types of items returned (default google_trends_graph; values: google_trends_graph, google_trends_map, google_trends_topics_list, google_trends_queries_list)",
    ).optional(),
}).strict();
