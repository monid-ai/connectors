import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zOnpageInstantPagesBody } from "./schema/inputs.ts";

/**
 * Audit Page On-Page — `POST /v3/on_page/instant_pages` (v1
 * `/onpage/instant-pages`). Flat: $0.00015 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Audit Page On-Page",
        summary: "Crawl one URL now and get 60+ on-page SEO checks and " +
            "metrics.",
        description: "Live on-page audit of a single URL. Returns the page's " +
            "status code, meta title, description and headings, " +
            "canonical, content and word counts, readability, internal " +
            "and external link counts, images, page timing and size, " +
            "duplicate and thin-content flags, and 60+ check flags " +
            "(missing alt, no h1, low text ratio, and more). Supports " +
            "custom user agent, browser preset, JavaScript execution and " +
            "browser rendering (extra cost), resource loading, and " +
            "custom_js. Suited for page audits and QA of deployed " +
            "changes.",
        docsUrl: "https://docs.dataforseo.com/v3/on_page/instant_pages/",
        categories: ["web-extraction", "seo"],
        notes: [
            "enable_javascript, enable_browser_rendering, and " +
            "load_resources each add to the per-page price.",
        ],
    },
    endpoint: "/onpage/instant-pages",
    request: { method: "POST", path: "/v3/on_page/instant_pages" },
    input: { schema: { body: zOnpageInstantPagesBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.00015 },
        },
    },
});
