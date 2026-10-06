import { z } from "zod";
import {
    zCountryLocaleFields,
    zLimit,
    zOffset,
    zTarget,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/dataforseo_labs/google/domain_rank_overview/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zLabsDomainRankOverviewBody = z.object({
    target: zTarget,
    ...zCountryLocaleFields,
    ignore_synonyms: z.boolean().describe(
        "Ignore highly similar keywords (default false)",
    ).optional(),
    limit: zLimit(1000, 100),
    offset: zOffset,
}).strict();
