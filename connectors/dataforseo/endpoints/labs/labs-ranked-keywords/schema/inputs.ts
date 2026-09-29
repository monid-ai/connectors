import { z } from "zod";
import {
    zCountryLocaleFields,
    zFilters,
    zLimit,
    zOffset,
    zOrderBy,
    zTarget,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/dataforseo_labs/google/ranked_keywords/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zLabsRankedKeywordsBody = z.object({
    target: zTarget,
    ...zCountryLocaleFields,
    ignore_synonyms: z.boolean().describe(
        "Ignore highly similar keywords (default false)",
    ).optional(),
    item_types: z.array(z.string().min(1)).describe(
        "Display results by item type (default ['organic', 'paid']; values: ['organic', 'paid', 'featured_snippet', 'local_pack', 'ai_overview_reference'])",
    ).optional(),
    include_clickstream_data: z.boolean().describe(
        "Include or exclude data from clickstream-based metrics in the result (default false)",
    ).optional(),
    limit: zLimit(1000, 100),
    offset: zOffset,
    load_rank_absolute: z.boolean().describe(
        "Return rankings distribution by rank_absolute (default false)",
    ).optional(),
    historical_serp_mode: z.string().min(1).describe(
        "Data collection mode (default live)",
    ).optional(),
    filters: zFilters,
    order_by: zOrderBy,
}).strict();
