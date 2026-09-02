import { defineProvider, presets } from "@shared/core";

/**
 * TinyFish (tinyfish.ai) — both integrated endpoints are FREE (0 credits on
 * every plan; plans differ on rate limit, not price), so usage is a flat
 * provider-level perCall: 1 call unit, no vendor cost. NO provider baseUrl:
 * TinyFish serves each product from its own host, so each endpoint declares
 * its own `request.baseUrl` (the per-endpoint override's first real use).
 */
export default defineProvider({
    name: "tinyfish",
    meta: {
        displayName: "TinyFish",
        summary: "Zero-cost live-web search and clean multi-URL fetch.",
        description: "Zero-cost access to the live web — browser-rendered, " +
            "never-cached web, news, and research-paper search, plus clean " +
            "Markdown, HTML, or JSON extraction for up to 10 URLs per call " +
            "with CSS-scoped selection and conditional 304 re-fetch.",
        homepageUrl: "https://tinyfish.ai",
        docsUrl: "https://docs.tinyfish.ai",
        categories: ["web-search"],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    usage: { consolidate: presets.usage.perCall() },
});
