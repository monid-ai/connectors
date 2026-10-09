import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zScrapeMarkdownQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Scrape Markdown",
        summary: "Scrape any URL into clean, LLM-ready Markdown.",
        description: "Turn a single URL into clean Markdown optimized for " +
            "prompts, RAG, search, and analysis. JavaScript rendering, " +
            "anti-bot bypass, and premium residential proxies are handled " +
            "server-side and included in the price; PDFs are fetched and " +
            "parsed natively; YouTube video and channel URLs return the " +
            "video or channel itself, transcript included when captions " +
            "exist. Options control link and image preservation, base64 " +
            "shortening, main-content-only extraction, iframe rendering, " +
            "animation settling, cache reuse (maxAgeMs), an extra " +
            "post-load wait (waitForMs), the proxy exit country, and " +
            "whether to also return the source HTML. The response carries " +
            "the Markdown plus page metadata (title, language, canonical " +
            "URL, author, site name, Open Graph, Twitter card, JSON-LD).",
        docsUrl: "https://docs.context.dev/api-reference/web-scraping/markdown",
        categories: ["web-extraction"],
    },
    request: { method: "GET", path: "/web/scrape/markdown" },
    input: { schema: { queryParams: zScrapeMarkdownQueryParams } },
    // v1's budget for a slow single-page render (PDF parsing included);
    // the request budget stays the provider's 60s.
    timeouts: { runMs: 300_000 },
    usage: {
        /** 1 credit per successfully scraped page —
         *  https://www.context.dev/pricing (2026-09-17). Estimate/evidence
         *  are compiler-synthesized (flat model); the provider consolidate
         *  lifts `key_metadata.credits_consumed`. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "scrapes",
            consumes: { credit: "default", amount: 1 },
        },
    },
});
