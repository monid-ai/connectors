import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zOnpageContentParsingBody } from "./schema/inputs.ts";

/**
 * Parse Page Content — `POST /v3/on_page/content_parsing/live` (v1
 * `/onpage/content-parsing`). Flat: $0.00015 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Parse Page Content",
        summary: "Fetch a URL and get its content as structured text blocks.",
        description:
            "Parsed content of a single URL: the main text split into " +
            "headings, paragraphs, lists, tables, and links, with the " +
            "page title and meta tags. Supports JavaScript execution and " +
            "browser rendering (extra cost), custom user agent, and " +
            "markdown_view for a markdown rendering. Suited for feeding " +
            "page text to a model without scraping boilerplate.",
        docsUrl: "https://docs.dataforseo.com/v3/on_page/content_parsing/live/",
        categories: ["web-extraction"],
        notes: [
            "enable_javascript and enable_browser_rendering add to the " +
            "per-page price.",
        ],
    },
    endpoint: "/onpage/content-parsing",
    request: { method: "POST", path: "/v3/on_page/content_parsing/live" },
    input: { schema: { body: zOnpageContentParsingBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.00015 },
        },
    },
});
