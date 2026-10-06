import { z } from "zod";
import { zDepth } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/serp/naver/organic/task_post` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zSerpNaverOrganicBody = z.object({
    keyword: z.string().min(1).max(700).describe(
        "Search query, up to 700 characters.",
    ),
    url: z.string().min(1).describe(
        "Direct URL of the search query",
    ).optional(),
    depth: zDepth(700, 15, 15),
    max_crawl_pages: z.number().int().min(1).max(100).describe(
        "Page crawl limit (default 1; max 100)",
    ).optional(),
    device: z.string().min(1).describe(
        "Device type (default desktop; values: desktop, mobile)",
    ).optional(),
    os: z.string().min(1).describe(
        "Device operating system (default windows)",
    ).optional(),
    se_domain: z.string().min(1).describe(
        "Search engine domain (e.g. search.naver.com)",
    ).optional(),
    search_param: z.string().min(1).describe(
        "Additional parameters of the search query",
    ).optional(),
    stop_crawl_on_match: z.array(z.record(z.string(), z.any())).describe(
        "Stop crawl on match",
    ).optional(),
}).strict();
