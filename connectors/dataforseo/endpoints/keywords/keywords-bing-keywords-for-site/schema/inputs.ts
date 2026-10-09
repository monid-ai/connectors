import { z } from "zod";
import { zCountryLocaleFields, zTarget } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/keywords_data/bing/keywords_for_site/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zKeywordsBingKeywordsForSiteBody = z.object({
    target: zTarget,
    ...zCountryLocaleFields,
    keywords_negative: z.array(z.string().min(1)).describe(
        "Keywords negative array",
    ).optional(),
    device: z.string().min(1).describe(
        "Device type (default all; values: all, mobile, desktop, tablet)",
    ).optional(),
    date_from: z.iso.date().describe(
        "Starting date of the time range",
    ).optional(),
    date_to: z.iso.date().describe(
        "Ending date of the time range",
    ).optional(),
    sort_by: z.string().min(1).describe(
        "Results sorting parameters (default relevance)",
    ).optional(),
    search_partners: z.boolean().describe(
        "Bing search partners type (default false - results are returned for Bing, AOL, and Yahoo search networks)",
    ).optional(),
}).strict();
