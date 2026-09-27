import { z } from "zod";
import {
    zFilters,
    zLimit,
    zOffset,
    zOrderBy,
} from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/domain_analytics/whois/overview/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zDomainWhoisBody = z.object({
    limit: zLimit(1000, 100),
    offset: zOffset,
    offset_token: z.string().min(1).describe(
        "Token for subsequent requests",
    ).optional(),
    filters: zFilters,
    order_by: zOrderBy,
}).strict();
