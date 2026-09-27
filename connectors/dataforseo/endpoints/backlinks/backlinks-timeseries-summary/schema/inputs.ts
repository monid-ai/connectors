import { z } from "zod";
import { zTarget } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/backlinks/timeseries_summary/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zBacklinksTimeseriesSummaryBody = z.object({
    target: zTarget,
    date_from: z.iso.date().describe(
        "Starting date of the time range",
    ).optional(),
    date_to: z.iso.date().describe(
        "Ending date of the time range",
    ).optional(),
    group_range: z.string().min(1).describe(
        "Time range which will be used to group the results (default month; values: day, week, month, year)",
    ).optional(),
    include_subdomains: z.boolean().describe(
        "Indicates if the subdomains of the target will be included in the search (default true)",
    ).optional(),
    rank_scale: z.string().min(1).describe(
        "Defines the scale used for calculating and displaying the rank, domain_from_rank, and page_from_rank values (default one_thousand; values: one_hundred)",
    ).optional(),
}).strict();
