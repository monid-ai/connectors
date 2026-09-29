import { z } from "zod";
import { zCountryLocaleFields, zKeywords } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/keywords_data/bing/search_volume_history/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zKeywordsBingSearchVolumeHistoryBody = z.object({
    keywords: zKeywords(1000),
    ...zCountryLocaleFields,
    device: z.array(z.string().min(1)).describe(
        "Device types (default ['mobile', 'desktop', 'tablet', 'non_smartphones']; values: mobile, desktop, tablet, non_smartphones)",
    ).optional(),
    period: z.string().min(1).describe(
        "Aggregates the returned data to a certain time period (default monthly; values: monthly, weekly, daily)",
    ).optional(),
    date_from: z.iso.date().describe(
        "Starting date of the time range",
    ).optional(),
    date_to: z.iso.date().describe(
        "Ending date of the time range",
    ).optional(),
}).strict();
