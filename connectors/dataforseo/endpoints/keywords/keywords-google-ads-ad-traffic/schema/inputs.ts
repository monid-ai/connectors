import { z } from "zod";
import { zCountryLocaleFields, zKeywords } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/keywords_data/google_ads/ad_traffic_by_keywords/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zKeywordsGoogleAdsAdTrafficBody = z.object({
    keywords: zKeywords(1000),
    bid: z.number().int().describe("The maximum custom bid"),
    match: z.string().min(1).describe("Keywords match-type"),
    ...zCountryLocaleFields,
    date_from: z.iso.date().describe(
        "Starting date of the forecasting time range",
    ).optional(),
    date_to: z.iso.date().describe(
        "Ending date of the forecasting time range",
    ).optional(),
    date_interval: z.string().min(1).describe(
        "Forecasting date interval (default next_month; values: next_week, next_month, next_quarter)",
    ).optional(),
    sort_by: z.string().min(1).describe(
        "Results sorting parameters (default relevance)",
    ).optional(),
}).strict();
