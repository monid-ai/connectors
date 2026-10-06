import { z } from "zod";
import { zDepth, zLocaleFields } from "../../../../schema/common.ts";

/**
 * Request body of `POST /v3/serp/google/organic/live/advanced` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zSerpGoogleOrganicBody = z.object({
    keyword: z.string().min(1).max(700).describe(
        "Search query, up to 700 characters.",
    ),
    ...zLocaleFields,
    depth: zDepth(200, 10, 10),
    device: z.string().min(1).describe(
        "Device type (default desktop; values: desktop, mobile)",
    ).optional(),
    load_async_ai_overview: z.boolean().describe(
        "Also load AI overviews that Google renders asynchronously; adds $0.002, refunded when the SERP has none.",
    ).optional(),
    os: z.string().min(1).describe(
        "Device operating system (default windows)",
    ).optional(),
    stop_crawl_on_match: z.array(z.record(z.string(), z.any())).describe(
        "Stop crawl on match",
    ).optional(),
    match_type: z.string().min(1).describe(
        "How match_value is matched for stop_crawl_on_match: domain, with_subdomains, or wildcard.",
    ).optional(),
    match_value: z.string().min(1).describe(
        "Target domain, subdomain, or wildcard value",
    ).optional(),
    max_crawl_pages: z.number().int().min(1).max(100).describe(
        "Page crawl limit (max 100)",
    ).optional(),
    search_param: z.string().min(1).describe(
        "Additional parameters of the search query",
    ).optional(),
    remove_from_url: z.array(z.string().min(1)).describe(
        "Remove specific parameters from URLs",
    ).optional(),
    people_also_ask_click_depth: z.number().int().min(1).max(4).describe(
        "Expand People Also Ask this many levels (1-4); each click adds $0.00015, refunded when the element is absent.",
    ).optional(),
    group_organic_results: z.boolean().describe(
        "Display related results (default true)",
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
    target: z.string().min(1).describe(
        "Target domain, subdomain, or webpage to get results for",
    ).optional(),
    target_search_mode: z.string().min(1).describe(
        "How target must match: 'any' (default) or 'all' of find_targets_in elements.",
    ).optional(),
    find_targets_in: z.array(z.string().min(1)).describe(
        "SERP element types to check for targets (values: organic, paid, local_pack, featured_snippet, events, google_flights, images, jobs, knowledge_graph, local_service, map, scholarly_articles, third_party_reviews, twitter)",
    ).optional(),
    ignore_targets_in: z.array(z.string().min(1)).describe(
        "SERP element types to exclude from target search (values: organic, paid, local_pack, featured_snippet, events, google_flights, images, jobs, knowledge_graph, local_service, map, scholarly_articles, third_party_reviews, twitter)",
    ).optional(),
}).strict();
