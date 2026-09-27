import { z } from "zod";
import { zTargets } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/backlinks/bulk_pages_summary/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zBacklinksBulkPagesSummaryBody = z.object({
    targets: zTargets(1000),
    include_subdomains: z.boolean().describe(
        "Indicates if the subdomains of the target will be included in the search (default true)",
    ).optional(),
    rank_scale: z.string().min(1).describe(
        "Defines the scale used for calculating and displaying the rank, domain_from_rank, and page_from_rank values (default one_thousand; values: one_hundred)",
    ).optional(),
}).strict();
