import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zOnpagePageScreenshotBody } from "./schema/inputs.ts";

/**
 * Screenshot Page — `POST /v3/on_page/page_screenshot` (v1
 * `/onpage/page-screenshot`). Flat: $0.0048 per screenshot — the
 * vendor's pricing page (dataforseo.com/pricing/on-page, 2026-09-25); v1
 * carried the basic page price $0.00015 (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Screenshot Page",
        summary: "Take a full-page screenshot of a URL and get an image link.",
        description:
            "Screenshot of a single URL rendered in a browser. Returns a " +
            "link to the image plus the render settings used. Supports " +
            "browser preset, screen width and height, " +
            "full_page_screenshot, disable_cookie_popup, and custom user " +
            "agent. The image link is valid for one day. Suited for " +
            "visual QA and archiving how a page looked.",
        docsUrl: "https://docs.dataforseo.com/v3/on_page/page_screenshot/",
        categories: ["web-extraction"],
    },
    endpoint: "/onpage/page-screenshot",
    request: { method: "POST", path: "/v3/on_page/page_screenshot" },
    input: { schema: { body: zOnpagePageScreenshotBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.0048 },
        },
    },
});
