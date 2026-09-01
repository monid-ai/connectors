import { defineProvider, presets } from "@shared/core";

export default defineProvider({
    name: "exa",
    meta: {
        displayName: "Exa",
        summary: "AI-native web search and content extraction.",
        description: "AI-native web search and content extraction — neural " +
            "and keyword search across the open web with built-in highlights, " +
            "summaries, and structured output extraction. Exa indexes the web " +
            "for embedding-based retrieval, so a query can describe the page " +
            "you want in natural language instead of matching keywords.",
        homepageUrl: "https://exa.ai",
        docsUrl: "https://exa.ai/docs",
        categories: ["web-search"],
    },
    auth: {
        inject: presets.auth.header("x-api-key"),
        // credentials omitted → default { apiKey: non-empty string } (§sections/auth.ts)
    },
    request: { baseUrl: "https://api.exa.ai" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
});
