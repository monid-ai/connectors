import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zAiGeminiSearchBody } from "./schema/inputs.ts";

/**
 * Gemini Search Answer — `POST
 * /v3/ai_optimization/gemini/llm_scraper/live/advanced` (v1
 * `/ai/gemini-search`). Flat: $0.004 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Gemini Search Answer",
        summary: "Get Gemini's answer to a query as a signed-out user would " +
            "see it.",
        description:
            "Gemini (gemini.google.com) response for a keyword, location, " +
            "and language as the public web UI shows it. Returns the " +
            "answer text in sections with cited sources (title, URL, " +
            "domain) and the entities mentioned. Supports location, " +
            "coordinates, and language targeting. Suited for tracking " +
            "brand presence and citations inside Gemini answers.",
        docsUrl:
            "https://docs.dataforseo.com/v3/ai_optimization/gemini/llm_scraper/live/advanced/",
        categories: ["ai-search", "geo"],
    },
    endpoint: "/ai/gemini-search",
    request: {
        method: "POST",
        path: "/v3/ai_optimization/gemini/llm_scraper/live/advanced",
    },
    input: { schema: { body: zAiGeminiSearchBody } },
    timeouts: { requestMs: 100_000, runMs: 100_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.004 },
        },
    },
});
