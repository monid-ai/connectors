import { defineProvider, presets } from "@shared/core";

/**
 * Octen (octen.ai) — real-time web access. PORT SCOPE: only the four
 * endpoints v1 had ENABLED (search, broad-search, extract, embedding). The
 * other seven were deliberately disabled there ($0 token-pricing
 * placeholders, invite-only betas, or an inadmissible rate matrix) — porting
 * them would expose the exact free compute v1 disabled them to avoid; they
 * arrive with the pricing pass, as their own change.
 *
 * Usage is NATIVE per endpoint (calls / sub-queries / URLs / tokens read
 * from the response's `meta.usage` receipt), so each endpoint carries its
 * own settle fn — no provider-level usage.
 */
export default defineProvider({
    name: "octen",
    meta: {
        displayName: "Octen",
        summary: "Real-time web search, extraction, and embeddings.",
        description: "Real-time access to the live web — minute-fresh web " +
            "and broad multi-query search, clean content extraction, text " +
            "embeddings, and a search-grounded model gateway " +
            "(OpenAI/Anthropic-compatible).",
        homepageUrl: "https://octen.ai",
        docsUrl: "https://docs.octen.ai",
        categories: ["web-search"],
    },
    auth: { inject: presets.auth.header("x-api-key") },
    request: { baseUrl: "https://api.octen.ai" },
});
