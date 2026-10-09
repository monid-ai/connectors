import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCrawlBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Crawl Website",
        summary:
            "Crawl a website and return clean Markdown for every page crawled.",
        description: "Crawl a site from a starting URL and get one clean, " +
            "LLM-ready Markdown document per page — the ingestion primitive " +
            "for RAG pipelines, search indexes, and knowledge bases. " +
            "Controls cover the page cap (maxPages, hard cap 500), link " +
            "depth, a URL regex filter, subdomain following, per-page " +
            "Markdown options (links, images, main-content-only, iframes, " +
            "CSS include/exclude selectors), PDF parsing and OCR, cache " +
            "reuse, and a soft crawl time budget (stopAfterMs, max 110s). " +
            "The response reports per-page Markdown and metadata plus a " +
            "crawl summary (numUrls, numSucceeded, numFailed, numSkipped).",
        docsUrl: "https://docs.context.dev/api-reference/web-scraping/crawl",
        categories: ["web-extraction"],
        notes: [
            "A PDF page recovered by OCR (pdf.ocr) costs an extra credit " +
            "upstream; the response's own credit count settles it.",
        ],
    },
    request: { method: "POST", path: "/web/crawl" },
    // `maxPages` REQUIRED at the binding (design D25 — the mirror stays
    // the faithful vendor contract, optional there): it is the estimate's
    // whole basis, so the caller states it.
    input: { schema: { body: zCrawlBody.required({ maxPages: true }) } },
    // a crawl runs until its own soft budget (stopAfterMs, max 110s)
    // expires; v1's headroom to return the pages collected so far
    timeouts: { requestMs: 310_000, runMs: 310_000 },
    usage: {
        /** 1 credit per page actually scraped —
         *  https://www.context.dev/pricing (2026-09-17): failed and
         *  skipped pages are free. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.PAGE,
            label: "pages",
            description: "pages successfully crawled (metadata.numSucceeded)",
            consumes: { credit: "default", amount: 1 },
        },
        /** The caller-stated `maxPages` IS the page promise (typed read —
         *  the estimate sees the PRE-toRequest validated input, D25). */
        estimate: ({ data }) => ({
            counts: { PAGE: data.input.body.maxPages },
        }),
        /** Settle on the crawl summary's `numSucceeded` (the pages the
         *  vendor scraped and bills). A strict read: the vendor marks it
         *  required, and `results[]` also lists the failed pages, so its
         *  length is no substitute. */
        evidence: ({ data, utils }) => ({
            counts: {
                PAGE: utils.json.num(data.output, "$.metadata.numSucceeded"),
            },
        }),
    },
});
