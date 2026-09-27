import { z } from "zod";
import { zCountryLocaleFields, zTarget } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/keywords_data/google_ads/keywords_for_site/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zKeywordsGoogleAdsKeywordsForSiteBody = z.object({
    target: zTarget,
    target_type: z.string().min(1).describe(
        "Search keywords for site or for url (default page; values: site, page)",
    ).optional(),
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
        "Include keywords associated with adult content (default false)",
    ).optional(),
    sort_by: z.string().min(1).describe(
        "Results sorting parameters (default relevance)",
    ).optional(),
}).strict();
