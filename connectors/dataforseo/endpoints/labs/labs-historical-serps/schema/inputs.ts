import { z } from "zod";
import { zCountryLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/dataforseo_labs/google/historical_serps/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zLabsHistoricalSerpsBody = z.object({
    keyword: z.string().min(1).describe("Keyword"),
    date_from: z.iso.date().describe(
        "Starting date of the time range",
    ).optional(),
    date_to: z.iso.date().describe(
        "Ending date of the time range",
    ).optional(),
    ...zCountryLocaleFields,
}).strict();
