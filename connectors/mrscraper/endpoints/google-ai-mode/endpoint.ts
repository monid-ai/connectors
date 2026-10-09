import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleAiModeBody } from "./schema/inputs.ts";

/** POST /api/google/ai-mode/sync — Google AI Mode's answer for a keyword. */
export default defineEndpoint({
    meta: {
        displayName: "Google AI Mode Answer",
        summary:
            "Get Google's AI Mode answer for a keyword as structured text blocks and Markdown.",
        description: "Query Google AI Mode (the AI Overview search " +
            "experience) for a keyword. Returns search metadata, the " +
            "answer as typed text blocks (header, paragraph, list), " +
            "reference links, and the whole answer as Markdown. Supports " +
            "country and location targeting and an optional image URL for " +
            "a multimodal query. Suited for tracking what Google's AI says " +
            "about a topic, brand, or product, and for AI-visibility " +
            "monitoring.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["ai-search"],
    },
    /** PUBLIC identity (design D1): the id is v1's published one. */
    endpoint: "/google/ai-mode",
    request: { method: "POST", path: "/api/google/ai-mode/sync" },
    input: { schema: { body: zGoogleAiModeBody } },
    usage: {
        /** 10 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 10 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
