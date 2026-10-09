import { z } from "zod";
import {
    markdownOptionFields,
    zCountry,
    zPageUrl,
    zPdfOptions,
    zScrapeMaxAgeMs,
    zTimeoutOpts,
    zWaitForMs,
    zZdr,
} from "../../../schema/common.ts";

/** POST /web/crawl body — the vendor mirror
 *  (docs.context.dev/api-reference/web-scraping/crawl, 2026-09-17). `tags`
 *  (request tagging) is operator plumbing and not carried. */
export const zCrawlBody = z.object({
    url: zPageUrl.describe(
        "Starting URL for the crawl, including the http:// or https:// scheme.",
    ),
    maxPages: z.number().int().min(1).max(500).describe(
        "Maximum number of pages to crawl (1-500). Default 100. Sizes the " +
            "hold: one credit per page.",
    ).optional(),
    maxDepth: z.number().int().min(0).describe(
        "Maximum link depth from the starting URL (0 = only the starting " +
            "page). Unlimited when omitted.",
    ).optional(),
    urlRegex: z.string().describe(
        "Only URLs matching this pattern are followed and scraped.",
    ).optional(),
    includeLinks: markdownOptionFields.includeLinks.optional(),
    includeImages: markdownOptionFields.includeImages.optional(),
    shortenBase64Images: markdownOptionFields.shortenBase64Images.optional(),
    useMainContentOnly: markdownOptionFields.useMainContentOnly.optional(),
    followSubdomains: z.boolean().describe(
        "Follow links on subdomains of the starting URL's domain. www and " +
            "apex are always equivalent. Default false.",
    ).optional(),
    pdf: zPdfOptions.describe("PDF parsing controls.").optional(),
    includeFrames: markdownOptionFields.includeFrames.optional(),
    includeSelectors: z.array(z.string().max(2048)).max(50).describe(
        "CSS selectors. When provided, only matching subtrees are kept " +
            "before each page is converted to Markdown.",
    ).optional(),
    excludeSelectors: z.array(z.string().max(2048)).max(50).describe(
        "CSS selectors to remove before conversion. Applied after " +
            "includeSelectors; exclusion wins on a double match.",
    ).optional(),
    maxAgeMs: zScrapeMaxAgeMs.optional(),
    waitForMs: zWaitForMs.optional(),
    settleAnimations: z.boolean().describe(
        "Wait briefly for animations to settle before capturing each page. " +
            "Default false.",
    ).optional(),
    stopAfterMs: z.number().int().min(10000).max(110000).describe(
        "Soft time budget for the whole crawl in milliseconds " +
            "(10000-110000, default 80000). When exceeded, the pages " +
            "collected so far are returned.",
    ).optional(),
    country: zCountry.optional(),
    timeoutOpts: zTimeoutOpts.optional(),
    zdr: zZdr.optional(),
}).strict();
