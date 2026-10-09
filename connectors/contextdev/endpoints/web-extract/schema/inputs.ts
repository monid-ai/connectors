import { z } from "zod";
import {
    zPageUrl,
    zScrapeMaxAgeMs,
    zTimeoutOpts,
    zWaitForMs,
} from "../../../schema/common.ts";

/** POST /web/extract body — the vendor mirror
 *  (docs.context.dev/api-reference/web-extraction/extract, 2026-09-17).
 *  Browser `actions` (paid plan, 2×) and `tags` are not carried. */
export const zExtractBody = z.object({
    url: zPageUrl.describe(
        "Starting website URL to crawl and extract from.",
    ),
    schema: z.record(z.string(), z.any()).describe(
        "JSON Schema describing the object to return. Context.dev fills " +
            "exactly this shape; image fields such as image_urls make page " +
            "image references available to extraction.",
    ),
    instructions: z.string().max(2000).describe(
        "Extraction guidance: which facts to prioritize, how to interpret " +
            "ambiguous fields.",
    ).optional(),
    factCheck: z.boolean().describe(
        "When true, every returned value must be grounded in text stated " +
            "on the page and unsupported fields come back null/empty. " +
            "Default false: reasonable inferences are allowed.",
    ).optional(),
    followSubdomains: z.boolean().describe(
        "Follow links on subdomains of the starting URL's domain. Default " +
            "false.",
    ).optional(),
    maxPages: z.number().int().min(1).max(50).describe(
        "Maximum number of pages to analyze (1-50). Default 5. Does not " +
            "change the price.",
    ).optional(),
    maxDepth: z.number().int().min(0).describe(
        "Maximum link depth from the starting URL (0 = only the starting " +
            "page). Unlimited when omitted.",
    ).optional(),
    pdf: z.object({
        shouldParse: z.boolean().describe(
            "Fetch and parse PDF pages. Default true.",
        ).optional(),
        start: z.number().int().min(1).describe(
            "First 1-based PDF page to parse.",
        ).optional(),
        end: z.number().int().min(1).describe(
            "Last 1-based PDF page to parse. Must be >= start.",
        ).optional(),
    }).strict().describe("PDF parsing controls.").optional(),
    includeFrames: z.boolean().describe(
        "Include iframe contents in the Markdown handed to the extractor. " +
            "Default false.",
    ).optional(),
    maxAgeMs: zScrapeMaxAgeMs.describe(
        "Reuse cached scrape results younger than this many milliseconds. " +
            "Default 604800000 (7 days), max 2592000000 (30 days).",
    ).optional(),
    waitForMs: zWaitForMs.optional(),
    settleAnimations: z.boolean().describe(
        "Wait briefly for animations to settle before each page is read. " +
            "Default false.",
    ).optional(),
    stopAfterMs: z.number().int().min(10000).max(110000).describe(
        "Soft time budget for the crawl phase in milliseconds " +
            "(10000-110000, default 80000).",
    ).optional(),
    timeoutOpts: zTimeoutOpts.optional(),
}).strict();
