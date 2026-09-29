import { z } from "zod";
import { zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/merchant/google/product_info/task_post` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zGoogleShoppingProductInfoBody = z.object({
    product_id: z.string().min(1).describe(
        "Unique product identifier on Google Shopping (e.g. 4485466949985702538)",
    ).optional(),
    data_docid: z.string().min(1).describe(
        "Unique identifier of the SERP data element (e.g. 13071766526042404278)",
    ).optional(),
    gid: z.string().min(1).describe(
        "Global product identifier on Google Shopping (e.g. 4702526954592161872)",
    ).optional(),
    ...zLocaleFields,
    se_domain: z.string().min(1).describe(
        "Search engine domain (e.g. google.co.uk)",
    ).optional(),
}).strict();
