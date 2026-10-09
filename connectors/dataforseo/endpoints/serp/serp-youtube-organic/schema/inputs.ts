import { z } from "zod";
import { zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/serp/youtube/organic/live/advanced` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zSerpYoutubeOrganicBody = z.object({
    ...zLocaleFields,
    keyword: z.string().min(1).max(700).describe(
        "Search query, up to 700 characters.",
    ),
    block_depth: z.number().int().min(1).max(200).describe(
        "Blocks of results to collect (1-200; the vendor's own default is " +
            "20); billed per page of 20.",
    ).optional(),
    device: z.enum(["desktop", "mobile"]).describe(
        "Device type (default desktop).",
    ).optional(),
}).strict();
