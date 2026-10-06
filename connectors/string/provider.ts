import { defineProvider, presets } from "@shared/core";

/**
 * String — web search and page fetching for agents, returned as clean,
 * LLM-ready content. JSON-over-HTTP against
 * `https://request.usestring.ai/v1` with `Authorization: Bearer <key>`
 * (portal.usestring.ai/docs/get-started/authentication).
 *
 * This cut ports `/search` and `/fetch` (see the PR description for why
 * `/sitemap` and the rest of the surface are left for a later PR).
 * Sourced entirely from String's own public docs, not third-party
 * reverse engineering — String is our own product, so the docs
 * are authoritative here rather than something to verify live against a
 * key the repo's author didn't have in hand while drafting this.
 *
 * Priced at the Growth-tier rate — $1.00/1,000 searches, $0.20-$4.00/1,000
 * fetches by billed class — per portal.usestring.ai/docs/get-started/
 * pricing (retrieved 2026-09-22); see each endpoint file for the per-unit
 * breakdown.
 */
export default defineProvider({
    name: "string",
    meta: {
        displayName: "String",
        summary: "Web search and page fetching for agents, as clean, " +
            "LLM-ready content.",
        description: "Search the web and fetch any page as clean, " +
            "LLM-ready content. Search covers Google, DuckDuckGo, " +
            "Brave, and Mojeek, including Google's rendered surfaces " +
            "(ads, local packs, knowledge panels, AI overviews, and " +
            "more) alongside ranked results.",
        homepageUrl: "https://usestring.ai",
        docsUrl: "https://portal.usestring.ai/docs/api-reference/overview",
        categories: ["web-search"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://request.usestring.ai/v1" },
    // Google paging can run String's own documented 45-second search
    // budget before returning a still-200 partial result (see
    // "Result count and paging" on the /search docs page).
    timeouts: { requestMs: 50_000, runMs: 55_000 },
    usage: {
        // String bills in plan-tier USD, not a vendor "credits" unit, and
        // exposes no consolidate-able receipt on the response — quoted
        // here at the Growth-tier rate.
        credits: {
            default: {
                label: "US dollars (Growth-tier rate)",
            },
        },
    },
});
