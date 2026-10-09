import { z } from "zod";
import {
    zFilters,
    zLimit,
    zOffset,
    zOrderBy,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/domain_analytics/technologies/domains_by_html_terms/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zDomainDomainsByHtmlTermsBody = z.object({
    search_terms: z.array(z.string().min(1)).max(10).describe(
        "Target search terms",
    ),
    keywords: z.array(z.string().min(1)).max(10).describe(
        "Target keywords in the domain's title, description or meta keywords",
    ).optional(),
    mode: z.string().min(1).describe("Search mode (default entry)").optional(),
    filters: zFilters,
    order_by: zOrderBy,
    limit: zLimit(10000, 100),
    offset: zOffset,
    offset_token: z.string().min(1).describe(
        "Token for subsequent requests",
    ).optional(),
}).strict();
