import { z } from "zod";

/**
 * Request body of `POST /v3/on_page/content_parsing/live` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zOnpageContentParsingBody = z.object({
    url: z.url().describe("Page URL to fetch, including the scheme."),
    custom_user_agent: z.string().min(1).describe(
        "Custom user agent (default Mozilla/5; e.g. Mozilla/5.0)",
    ).optional(),
    browser_preset: z.string().min(1).describe(
        "Preset for browser screen parameters (values: desktop, mobile, tablet desktop preset will apply the following values)",
    ).optional(),
    browser_screen_width: z.number().int().min(240).max(9999).describe(
        "Browser screen width in pixels (240-9999)",
    ).optional(),
    browser_screen_height: z.number().int().min(240).max(9999).describe(
        "Browser screen height in pixels (240-9999)",
    ).optional(),
    browser_screen_scale_factor: z.number().min(0.5).max(3).describe(
        "Browser screen scale factor (0.5-3)",
    ).optional(),
    store_raw_html: z.boolean().describe(
        "Store HTML of a crawled page (default false)",
    ).optional(),
    disable_cookie_popup: z.boolean().describe(
        "Disable the cookie popup (default false)",
    ).optional(),
    accept_language: z.string().min(1).describe(
        "Language header for accessing the website",
    ).optional(),
    enable_javascript: z.boolean().describe(
        "Load javascript on a page (default false)",
    ).optional(),
    enable_browser_rendering: z.boolean().describe(
        "Emulate browser rendering to measure Core Web Vitals (FID, CLS, LCP) (default false)",
    ).optional(),
    enable_xhr: z.boolean().describe(
        "Enable XMLHttpRequest on a page (default false)",
    ).optional(),
    switch_pool: z.boolean().describe("Switch proxy pool").optional(),
    ip_pool_for_scan: z.string().min(1).describe(
        "Proxy pool (values: us, de)",
    ).optional(),
    markdown_view: z.boolean().describe(
        "Return page content as markdown (default false)",
    ).optional(),
}).strict();
