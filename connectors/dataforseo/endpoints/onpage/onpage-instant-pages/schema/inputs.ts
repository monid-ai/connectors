import { z } from "zod";

/**
 * Request body of `POST /v3/on_page/instant_pages` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zOnpageInstantPagesBody = z.object({
    url: z.url().describe("Page URL to fetch, including the scheme."),
    custom_user_agent: z.string().min(1).describe(
        "Custom user agent (default Mozilla/5; e.g. Mozilla/5.0)",
    ).optional(),
    browser_preset: z.string().min(1).describe(
        "Browser preset (values: desktop, mobile, tablet)",
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
        "Store raw html (default false)",
    ).optional(),
    accept_language: z.string().min(1).describe("Accept language").optional(),
    load_resources: z.boolean().describe(
        "Load images, stylesheets, scripts, and broken resources (default false; adds to the page price)",
    ).optional(),
    enable_browser_rendering: z.boolean().describe(
        "Emulate a browser to measure Core Web Vitals (default false; needs enable_javascript and load_resources; adds to the page price)",
    ).optional(),
    disable_cookie_popup: z.boolean().describe(
        "Disable cookie popup (default false)",
    ).optional(),
    return_despite_timeout: z.boolean().describe(
        "Return despite timeout (default false)",
    ).optional(),
    enable_javascript: z.boolean().describe(
        "Load the scripts on the page (default false; adds to the page price)",
    ).optional(),
    enable_xhr: z.boolean().describe(
        "Enable XMLHttpRequest on the page (default false; needs enable_javascript)",
    ).optional(),
    custom_js: z.string().min(1).describe("Custom js").optional(),
    validate_micromarkup: z.boolean().describe(
        "Validate micromarkup (default false)",
    ).optional(),
    check_spell: z.boolean().describe("Check spell (default false)").optional(),
    checks_threshold: z.record(z.string(), z.number().int().nullable())
        .describe(
            'Custom integer thresholds for the checks, e.g. {"high_loading_time": 1}',
        ).optional(),
    switch_pool: z.boolean().describe("Switch pool").optional(),
    ip_pool_for_scan: z.string().min(1).describe(
        "Ip pool for scan (values: us, de)",
    ).optional(),
}).strict();
