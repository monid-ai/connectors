import { z } from "zod";
import { zDepth, zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/serp/google/news/live/advanced` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zSerpGoogleNewsBody = z.object({
    keyword: z.string().min(1).max(700).describe(
        "Search query, up to 700 characters.",
    ),
    ...zLocaleFields,
    depth: zDepth(200, 100, 100),
    os: z.string().min(1).describe(
        "Device operating system (default windows)",
    ).optional(),
    max_crawl_pages: z.number().int().min(1).max(100).describe(
        "Page crawl limit (max 100)",
    ).optional(),
    search_param: z.string().min(1).describe(
        "Additional parameters of the search query",
    ).optional(),
    calculate_rectangles: z.boolean().describe(
        "Add pixel rankings (distance of each element from the top-left corner); adds $0.002 to the call.",
    ).optional(),
    browser_screen_width: z.number().int().describe(
        "Browser screen width",
    ).optional(),
    browser_screen_height: z.number().int().describe(
        "Browser screen height",
    ).optional(),
    browser_screen_resolution_ratio: z.number().int().describe(
        "Browser screen resolution ratio",
    ).optional(),
    url: z.string().min(1).describe(
        "Direct URL of the search query",
    ).optional(),
    se_domain: z.string().min(1).describe(
        "Search engine domain (e.g. google.co.uk)",
    ).optional(),
}).strict();
