import { z } from "zod";
import { zCountryLocaleFields, zTarget } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/dataforseo_labs/google/historical_rank_overview/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zLabsHistoricalRankOverviewBody = z.object({
    target: zTarget,
    ...zCountryLocaleFields,
    date_from: z.iso.date().describe(
        "Starting date of the time range",
    ).optional(),
    date_to: z.iso.date().describe(
        "Ending date of the time range",
    ).optional(),
    correlate: z.boolean().describe(
        "Correlate data with previously obtained datasets (default true)",
    ).optional(),
    ignore_synonyms: z.boolean().describe(
        "Ignore highly similar keywords (default false)",
    ).optional(),
    include_clickstream_data: z.boolean().describe(
        "Include or exclude data from clickstream-based metrics in the result (default false)",
    ).optional(),
}).strict();
