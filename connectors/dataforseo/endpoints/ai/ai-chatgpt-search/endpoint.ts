import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zAiChatgptSearchBody } from "./schema/inputs.ts";

/**
 * ChatGPT Search Answer — `POST
 * /v3/ai_optimization/chat_gpt/llm_scraper/live/advanced` (v1
 * `/ai/chatgpt-search`). Flat: $0.004 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "ChatGPT Search Answer",
        summary: "Get ChatGPT's answer to a query as a signed-out user would " +
            "see it.",
        description:
            "ChatGPT (chatgpt.com) response for a keyword, location, and " +
            "language as the public web UI shows it. Returns the answer " +
            "text in sections with cited sources (title, URL, domain), " +
            "the products or entities mentioned, and the model. Supports " +
            "location and language targeting. Suited for tracking brand " +
            "presence and citations inside ChatGPT answers. To find the " +
            "location_code or exact location_name, call " +
            "dataforseo#ai/chatgpt-search-locations (free lookup, country " +
            "filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/ai_optimization/chat_gpt/llm_scraper/live/advanced/",
        categories: ["ai-search", "geo"],
    },
    endpoint: "/ai/chatgpt-search",
    request: {
        method: "POST",
        path: "/v3/ai_optimization/chat_gpt/llm_scraper/live/advanced",
    },
    input: { schema: { body: zAiChatgptSearchBody } },
    timeouts: { requestMs: 100_000, runMs: 100_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.004 },
        },
    },
});
