import { z } from "zod";
import { zTargets } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/backlinks/bulk_backlinks/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zBacklinksBulkBacklinksBody = z.object({
    targets: zTargets(1000),
}).strict();
