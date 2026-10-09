import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zAugmentScrapeBody } from "./schema/inputs.ts";

/**
 * Venice `POST /augment/scrape` — fetch one URL and return it as Markdown.
 * Flat $0.01 per successful call (Venice price sheet: `scrape-augmentation`
 * $10 per 1,000, verified 2026-10-08); rejected and failed URLs are not
 * charged. No meter on the response — the derived fold is the bill.
 */
export default defineEndpoint({
    meta: {
        displayName: "Venice Web Scrape",
        summary: "Fetch a public web page as clean Markdown.",
        description: "Fetch one public URL and return its main content as " +
            'Markdown ({url, content, format: "markdown"}). Useful after ' +
            "`venice#augment/search` to read a result in full. Sites that " +
            "block automated access — notably X/Twitter and Reddit — are " +
            "rejected immediately (and not charged); private, internal and " +
            "localhost addresses are refused.",
        docsUrl: "https://docs.venice.ai/api-reference/endpoint/augment/scrape",
        categories: ["web-scraping"],
        notes: [
            "Flat $0.01 per page.",
            "Venice rate-limits this endpoint at 20 requests per minute " +
            "per account.",
            "X/Twitter and Reddit URLs are refused with a 4xx before any " +
            "fetch.",
        ],
    },
    request: { method: "POST", path: "/augment/scrape" },
    input: { schema: { body: zAugmentScrapeBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.01 },
            label: "page",
            description: "one successfully scraped page",
        },
    },
    timeouts: { requestMs: 60_000, runMs: 60_000 },
});
