import { z } from "zod";
import {
    zCountryLocaleFields,
    zLimit,
    zOffset,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/dataforseo_labs/amazon/related_keywords/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zLabsAmazonRelatedKeywordsBody = z.object({
    keyword: z.string().min(1).describe("Keyword"),
    ...zCountryLocaleFields,
    depth: z.number().int().min(0).max(4).describe(
        "Suggestion depth to walk (0-4, default 1).",
    ).optional(),
    include_seed_keyword: z.boolean().describe(
        "Include data for the seed keyword (default false)",
    ).optional(),
    ignore_synonyms: z.boolean().describe(
        "Ignore highly similar keywords (default false)",
    ).optional(),
    limit: zLimit(1000, 100),
    offset: zOffset,
}).strict();
