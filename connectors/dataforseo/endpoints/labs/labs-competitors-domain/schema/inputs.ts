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
 * Request body of `POST /v3/dataforseo_labs/google/competitors_domain/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zLabsCompetitorsDomainBody = z.object({
    target: zTarget,
    ...zCountryLocaleFields,
    item_types: z.array(z.string().min(1)).describe(
        "Display results by item type (default ['organic', 'paid']; values: ['organic', 'paid', 'featured_snippet', 'local_pack'])",
    ).optional(),
    include_clickstream_data: z.boolean().describe(
        "Include or exclude data from clickstream-based metrics in the result (default false)",
    ).optional(),
    filters: zFilters,
    order_by: zOrderBy,
    limit: zLimit(1000, 100),
    offset: zOffset,
    max_rank_group: z.number().int().describe(
        "Maximum rank up to which competitors will be considered (default 100)",
    ).optional(),
    exclude_top_domains: z.boolean().describe(
        "Exclude the world's largest websites (wikipedia.org, amazon.com, youtube.com, ...) (default false)",
    ).optional(),
    exclude_domains: z.array(z.string().min(1)).max(1000).describe(
        "Exclude domains from the results",
    ).optional(),
    intersecting_domains: z.array(z.string().min(1)).max(20).describe(
        "Additional domains for improving results accuracy",
    ).optional(),
    ignore_synonyms: z.boolean().describe(
        "Ignore highly similar keywords (default false)",
    ).optional(),
}).strict();
