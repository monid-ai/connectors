import { z } from "zod";
import { zDepth, zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/serp/baidu/organic/task_post` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zSerpBaiduOrganicBody = z.object({
    keyword: z.string().min(1).max(700).describe(
        "Search query, up to 700 characters.",
    ),
    depth: zDepth(700, 10, 10),
    max_crawl_pages: z.number().int().min(1).max(100).describe(
        "Page crawl limit (default 1; max 100)",
    ).optional(),
    ...zLocaleFields,
    device: z.string().min(1).describe(
        "Device type (default desktop; values: desktop, mobile, tablet)",
    ).optional(),
    os: z.string().min(1).describe(
        "Device operating system (default windows)",
    ).optional(),
    get_website_url: z.boolean().describe(
        "Include direct URL for each ranked result (default false)",
    ).optional(),
    stop_crawl_on_match: z.array(z.record(z.string(), z.any())).describe(
        "Stop crawl on match",
    ).optional(),
}).strict();
