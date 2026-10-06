import { z } from "zod";
import { zCountryLocaleFields, zTargets } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/dataforseo_labs/google/bulk_traffic_estimation/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zLabsBulkTrafficEstimationBody = z.object({
    targets: zTargets(1000),
    ...zCountryLocaleFields,
    item_types: z.array(z.string().min(1)).describe(
        "Display results by item type (default ['organic', 'paid']; values: ['organic', 'paid', 'featured_snippet', 'local_pack'])",
    ).optional(),
    ignore_synonyms: z.boolean().describe(
        "Ignore highly similar keywords (default false)",
    ).optional(),
}).strict();
