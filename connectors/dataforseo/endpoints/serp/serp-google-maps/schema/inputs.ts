import { z } from "zod";
import { zDepth, zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/serp/google/maps/live/advanced` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zSerpGoogleMapsBody = z.object({
    keyword: z.string().min(1).max(700).describe(
        "Search query, up to 700 characters.",
    ),
    ...zLocaleFields,
    depth: zDepth(700, 100, 100),
    device: z.string().min(1).describe(
        "Device type (default desktop; values: desktop, mobile)",
    ).optional(),
    os: z.string().min(1).describe(
        "Device operating system (default windows)",
    ).optional(),
    max_crawl_pages: z.number().int().min(1).max(100).describe(
        "Page crawl limit (max 100)",
    ).optional(),
    url: z.string().min(1).describe(
        "Direct URL of the search query",
    ).optional(),
    se_domain: z.string().min(1).describe(
        "Search engine domain (e.g. google.co.uk)",
    ).optional(),
    search_this_area: z.boolean().describe(
        "Show results from the displayed area (default true; values: true, false)",
    ).optional(),
    search_places: z.boolean().describe(
        "Search places mode (default true)",
    ).optional(),
}).strict();
