import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zAugmentSearchBody } from "./schema/inputs.ts";

/**
 * Venice `POST /augment/search` — live web search returning structured
 * results. Flat $0.01 per successful call (Venice price sheet:
 * `search-augmentation` $10 per 1,000, verified 2026-10-08); errors are
 * not charged. No meter on the response — the derived fold is the bill.
 */
export default defineEndpoint({
    meta: {
        displayName: "Venice Web Search",
        summary: "Private live web search — Brave (zero data retention) or " +
            "anonymized Google.",
        description: "Search the live web and get structured results " +
            "({title, url, content, date}) — up to 20 per call. Two " +
            "privacy-preserving backends: `brave` (default) runs with Zero " +
            "Data Retention, so the query is never stored or logged; " +
            "`google` proxies the query through Venice so your identity is " +
            "never attached to it. `content` is a page excerpt, often " +
            "several paragraphs. Pipe a result URL to " +
            "`venice#augment/scrape` for the full page as Markdown, or use " +
            "`venice#chat/completions` with web search enabled when you " +
            "want a synthesized answer instead of raw results.",
        docsUrl: "https://docs.venice.ai/api-reference/endpoint/augment/search",
        categories: ["web-search"],
        notes: [
            "Flat $0.01 per call, whatever `limit` is.",
            "Venice rate-limits this endpoint at 20 requests per minute " +
            "per account.",
        ],
    },
    request: { method: "POST", path: "/augment/search" },
    input: {
        schema: {
            body: zAugmentSearchBody.extend({
                limit: zAugmentSearchBody.shape.limit.unwrap().default(10),
                search_provider: zAugmentSearchBody.shape.search_provider
                    .unwrap().default("brave"),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.01 },
            label: "search",
            description: "one successful web search",
        },
    },
    timeouts: { requestMs: 60_000, runMs: 60_000 },
});
