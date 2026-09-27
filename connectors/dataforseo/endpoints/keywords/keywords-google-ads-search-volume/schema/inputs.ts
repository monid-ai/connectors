import { z } from "zod";
import { zCountryLocaleFields, zKeywords } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/keywords_data/google_ads/search_volume/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zKeywordsGoogleAdsSearchVolumeBody = z.object({
    keywords: zKeywords(1000),
    ...zCountryLocaleFields,
    search_partners: z.boolean().describe(
        "Include Google search partners (default false - results are returned for Google search sites)",
    ).optional(),
    date_from: z.iso.date().describe(
        "Starting date of the time range",
    ).optional(),
    date_to: z.iso.date().describe(
        "Ending date of the time range",
    ).optional(),
    include_adult_keywords: z.boolean().describe(
        "Include keywords associated with adult content (default false; Google Ads may return no data for them)",
    ).optional(),
    sort_by: z.string().min(1).describe(
        "Results sorting parameters (default relevance)",
    ).optional(),
}).strict();
