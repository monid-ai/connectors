import { z } from "zod";
import {
    zFilters,
    zLimit,
    zOffset,
    zOrderBy,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/domain_analytics/technologies/domains_by_technology/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zDomainDomainsByTechnologyBody = z.object({
    technology_paths: z.array(
        z.object({
            path: z.string().min(1).describe(
                "$group_id.$category_id, e.g. 'content.cms'.",
            ),
            name: z.string().min(1).describe(
                "Technology name, e.g. 'wordpress'.",
            ),
        }).strict(),
    ).max(10).describe(
        "Target technology paths, up to 10 (required unless groups, categories, technologies, or keywords is given)",
    ).optional(),
    groups: z.array(z.string().min(1)).max(10).describe(
        "Ids of the target technology groups (required unless technologies, technology_paths, keywords or categories is given)",
    ).optional(),
    categories: z.array(z.string().min(1)).max(10).describe(
        "Ids of the target technology categories (required unless groups, technology_paths, keywords or technologies is given)",
    ).optional(),
    technologies: z.array(z.string().min(1)).max(10).describe(
        "Target technologies (required unless groups, technology_paths, keywords or categories is given)",
    ).optional(),
    keywords: z.array(z.string().min(1)).max(10).describe(
        "Target keywords in the domain's title, description or meta keywords (required unless groups, technology_paths, technologies, or categories is given)",
    ).optional(),
    mode: z.string().min(1).describe("Search mode (default as_is)").optional(),
    filters: zFilters,
    order_by: zOrderBy,
    limit: zLimit(10000, 100),
    offset: zOffset,
    offset_token: z.string().min(1).describe(
        "Token for subsequent requests",
    ).optional(),
}).strict();
