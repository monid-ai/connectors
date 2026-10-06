import { z } from "zod";
import { zDepth, zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/serp/seznam/organic/task_post` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zSerpSeznamOrganicBody = z.object({
    keyword: z.string().min(1).max(700).describe(
        "Search query, up to 700 characters.",
    ),
    ...zLocaleFields,
    url: z.string().min(1).describe(
        "Direct URL of the search query",
    ).optional(),
    depth: zDepth(500, 10, 10),
    max_crawl_pages: z.number().int().min(1).max(10).describe(
        "Page crawl limit (default 1; max 10)",
    ).optional(),
    device: z.string().min(1).describe(
        "Device type (default desktop; values: desktop, mobile)",
    ).optional(),
    os: z.string().min(1).describe(
        "Device operating system (default windows)",
    ).optional(),
    se_domain: z.string().min(1).describe(
        "Search engine domain (e.g. search.seznam.cz)",
    ).optional(),
    search_param: z.string().min(1).describe(
        "Additional parameters of the search query",
    ).optional(),
    calculate_rectangles: z.boolean().describe(
        "Add pixel rankings (distance of each element from the top-left corner); adds $0.002 to the call.",
    ).optional(),
    stop_crawl_on_match: z.array(z.record(z.string(), z.any())).describe(
        "Stop crawl on match",
    ).optional(),
}).strict();
