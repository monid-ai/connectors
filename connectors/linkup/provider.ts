import { defineProvider, presets } from "@shared/core";

/**
 * Linkup — real-time web search for AI: `/search` at four depths with three
 * output types, and `/fetch` for one URL to clean markdown, over
 * `https://api.linkup.so/v1` with `Authorization: Bearer <key>`.
 *
 * Rate card (https://docs.linkup.so/pages/documentation/platform/pricing,
 * verified 2026-10-01): a flat USD price per successful call, selected by
 * the request — `depth` × `outputType` on `/search`, `mode` × `renderJs`
 * (+ `schema`) on `/fetch`. Each endpoint models the published table as one
 * line per cell and counts exactly one of them from the request. Responses
 * carry no usage meter, so there is no `consolidate` — the derived fold is
 * the bill. Linkup charges nothing on an error, and the engine zero-bills
 * every non-2xx envelope.
 *
 * Vendor non-2xx is DATA: errors arrive as
 * `{error: {code, message, details}, statusCode}`, which `output.fromError`
 * normalizes here.
 */
export default defineProvider({
    name: "linkup",
    meta: {
        displayName: "Linkup",
        summary: "Real-time web search for AI, with sourced answers and " +
            "URL fetch to markdown.",
        description: "Linkup is a real-time web search API built for AI " +
            "agents. `/search` runs at four depths — 'flash' (ranked " +
            "snippets in a few hundred milliseconds), 'fast' (one-shot " +
            "retrieval in about a second), 'standard' (one pass of agentic " +
            "search) and 'deep' (several search-and-scrape iterations) — and " +
            "returns raw sources, an answer with its sources, or JSON shaped " +
            "by a schema you supply. `/fetch` turns one public URL (HTML or " +
            "PDF) into clean, LLM-ready markdown. Flat USD price per call; " +
            "failed calls are free.",
        homepageUrl: "https://www.linkup.so",
        docsUrl: "https://docs.linkup.so",
        categories: ["web-search", "web-scraping"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.linkup.so/v1" },
    // `deep` runs several search iterations; the slowest observed calls sit
    // well inside two minutes.
    timeouts: { requestMs: 120_000, runMs: 120_000 },
    usage: {
        /** THE credit system (design D26): Linkup publishes flat per-call
         *  prices in US dollars, so the pool is US dollars — pinned vendor
         *  unit prices, re-audited on repricing (the exa/apify posture). */
        credits: { default: { label: "US dollars" } },
    },
    output: {
        /** Linkup error envelopes: `{error: {code, message, details},
         *  statusCode}` on every 4xx/5xx. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const code = utils.json.optionalGet(data.output, "$.error.code");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "Linkup error",
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
});
