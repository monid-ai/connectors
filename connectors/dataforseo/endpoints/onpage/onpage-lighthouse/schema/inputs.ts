import { z } from "zod";

/**
 * Request body of `POST /v3/on_page/lighthouse/live/json` — the vendor's fields as
 * documented (docs.dataforseo.com, OpenAPI 89d7d681 2026-09-20); only
 * optionality, no defaults. Callback and queue fields (`postback_url`,
 * `pingback_url`, `postback_data`, `tag`, `priority`) are deliberately
 * absent — the object is strict, so they are rejected before any spend.
 */
export const zOnpageLighthouseBody = z.object({
    url: z.url().describe("Page URL to fetch, including the scheme."),
    for_mobile: z.boolean().describe(
        "Applies mobile emulation (default false)",
    ).optional(),
    categories: z.array(z.string().min(1)).describe(
        "Categories of Lighthouse audits (values: seo, performance, best_practices, accessibility)",
    ).optional(),
    audits: z.array(z.string().min(1)).describe("Lighthouse audits").optional(),
    version: z.string().min(1).describe("Lighthouse version").optional(),
    language_name: z.string().min(1).describe(
        "Lighthouse language name (default English)",
    ).optional(),
    language_code: z.string().min(1).describe(
        "Lighthouse language code (default en)",
    ).optional(),
    custom_user_agent: z.string().min(1).describe(
        "Custom user agent",
    ).optional(),
    browser_screen_width: z.number().int().describe(
        "Browser screen width",
    ).optional(),
    browser_screen_height: z.number().int().describe(
        "Browser screen height",
    ).optional(),
    browser_screen_scale_factor: z.number().describe(
        "Browser screen scale factor",
    ).optional(),
    browser_network_throttling_method: z.string().min(1).describe(
        "Browser network throttling method",
    ).optional(),
    browser_cpu_throttling_multiplier: z.number().describe(
        "Browser CPU throttling multiplier",
    ).optional(),
    browser_network_throttling: z.string().min(1).describe(
        "Browser network throttling (values: no_throttling, fast_4g, slow_4g, regular_3g, pc)",
    ).optional(),
}).strict();
