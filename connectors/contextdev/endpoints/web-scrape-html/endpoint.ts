import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zScrapeHtmlQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Scrape HTML",
        summary: "Fetch the fully rendered HTML of any page.",
        description: "Return the rendered DOM of a page when the " +
            "application needs the HTML rather than cleaned text — custom " +
            "parsing, archiving, QA, and extraction pipelines. Same " +
            "rendering stack as the Markdown scrape (JavaScript execution, " +
            "anti-bot bypass, premium proxies included), with options for " +
            "main-content-only output, inline iframe rendering, animation " +
            "settling, cache reuse, an extra post-load wait, and the proxy " +
            "exit country. Sitemaps and feeds come back as xml; office " +
            "documents as their detected type.",
        docsUrl: "https://docs.context.dev/api-reference/web-scraping/html",
        categories: ["web-extraction"],
    },
    request: { method: "GET", path: "/web/scrape/html" },
    input: { schema: { queryParams: zScrapeHtmlQueryParams } },
    usage: {
        /** 1 credit per successfully scraped page —
         *  https://www.context.dev/pricing (2026-09-17). */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "scrapes",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
