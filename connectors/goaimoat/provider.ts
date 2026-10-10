import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * GoAI Moat (goaimoat.com) — AI Visibility Audit (GEO).
 *
 * Measures whether a brand is mentioned, cited, and described correctly in
 * AI answers, then returns a tier, a 30-point checklist, and a fix-priority
 * plan. The audit is FREE today (0 credits on every plan).
 */
export default defineProvider({
    name: "goaimoat",
    meta: {
        displayName: "GoAI Moat",
        summary: "AI visibility audit — is a brand mentioned, cited, and described correctly by AI?",
        description: "GoAI Moat builds tools that make brands visible to AI. " +
            "Its AI Visibility Audit checks whether a brand is mentioned, cited, " +
            "and described correctly in AI answers (ChatGPT, Perplexity, Google " +
            "AI Overview, Amazon Rufus), then returns a tier, a 30-point " +
            "checklist, and a fix-priority plan.",
        homepageUrl: "https://goaimoat.com",
        docsUrl: "https://goaimoat.com",
        categories: ["geo"],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    request: { baseUrl: "https://mcp.goaimoat.com" },
    timeouts: { requestMs: 30_000, runMs: 60_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
