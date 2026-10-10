import { defineEndpoint } from "@shared/core";
import { zAuditBody } from "./schema/inputs.ts";

/**
 * GoAI Moat AI Visibility Audit — POST https://mcp.goaimoat.com/api/audit.
 *
 * FREE (0 credits): returns a brand's AI-visibility diagnosis — core thesis,
 * access tier, and (when a 0-30 checklist score is supplied) a fix-priority
 * plan. The deep-audit playbook (AI probe prompts, competitor-gap method,
 * 30-day plan) is gated behind a license in the full product at goaimoat.com.
 */
export default defineEndpoint({
    meta: {
        displayName: "AI Visibility Audit",
        summary: "Audit a brand's visibility in AI answers — free.",
        description: "Checks whether a brand is mentioned, cited, and described " +
            "correctly in AI answers (ChatGPT, Perplexity, Google AI Overview, " +
            "Amazon Rufus). Returns the core thesis, an access tier, and — when " +
            "a 0-30 checklist score is supplied — a fix-priority plan (P0/P1/P2). " +
            "For the full deep-audit playbook, use the full product at goaimoat.com.",
        docsUrl: "https://goaimoat.com",
        categories: ["geo"],
    },
    endpoint: "/ai-visibility",
    request: {
        method: "POST",
        path: "/api/audit",
    },
    input: { schema: { body: zAuditBody } },
});
