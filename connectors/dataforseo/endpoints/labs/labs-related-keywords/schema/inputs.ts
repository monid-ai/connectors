import { z } from "zod";
import {
    zCountryLocaleFields,
    zFilters,
    zLimit,
    zOffset,
    zOrderBy,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/dataforseo_labs/google/related_keywords/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zLabsRelatedKeywordsBody = z.object({
    keyword: z.string().min(1).describe("Keyword"),
    ...zCountryLocaleFields,
    depth: z.number().int().min(0).max(4).describe(
        "Related-searches depth to walk (0-4, default 1); each level multiplies the keyword count.",
    ).optional(),
    include_seed_keyword: z.boolean().describe(
        "Include data for the seed keyword (default false)",
    ).optional(),
    include_serp_info: z.boolean().describe(
        "Include data from SERP for each keyword (default false)",
    ).optional(),
    include_clickstream_data: z.boolean().describe(
        "Include clickstream data",
    ).optional(),
    ignore_synonyms: z.boolean().describe("Ignore synonyms").optional(),
    replace_with_core_keyword: z.boolean().describe(
        "Return data for core keyword (default false)",
    ).optional(),
    filters: zFilters,
    order_by: zOrderBy,
    limit: zLimit(1000, 100),
    offset: zOffset,
}).strict();
