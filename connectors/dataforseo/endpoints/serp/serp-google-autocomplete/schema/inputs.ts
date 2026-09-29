import { z } from "zod";
import { zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/serp/google/autocomplete/live/advanced` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zSerpGoogleAutocompleteBody = z.object({
    keyword: z.string().min(1).max(700).describe(
        "Search query, up to 700 characters.",
    ),
    ...zLocaleFields,
    cursor_pointer: z.number().int().min(0).describe(
        "Cursor position within the keyword, from 0 (default the end of the keyword)",
    ).optional(),
    client: z.string().min(1).describe(
        "Search client for autocomplete (values: chrome)",
    ).optional(),
}).strict();
