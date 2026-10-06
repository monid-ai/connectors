import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSerpGoogleAiModeBody } from "./schema/inputs.ts";

/**
 * Google AI Mode Answer — `POST /v3/serp/google/ai_mode/live/advanced` (v1
 * `/serp/google-ai-mode`). Flat: $0.004 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google AI Mode Answer",
        summary: "Fetch Google AI Mode's generated answer and cited sources " +
            "for a query.",
        description:
            "Google AI Mode response for a keyword and location. Returns " +
            "the AI-generated answer as markdown text with its reference " +
            "list (title, URL, domain, position), the query " +
            "interpretation, and any follow-up suggestions. Supports " +
            "location, language, and device. Suited for AI-search " +
            "visibility checks, citation tracking, and content gap " +
            "analysis against Google's AI answers. To find the " +
            "location_code or exact location_name for a city or country, " +
            "call dataforseo#serp/google-locations (free lookup of Google " +
            "locations; country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/serp/google/ai_mode/live/advanced/",
        categories: ["ai-search", "geo"],
    },
    endpoint: "/serp/google-ai-mode",
    request: { method: "POST", path: "/v3/serp/google/ai_mode/live/advanced" },
    input: { schema: { body: zSerpGoogleAiModeBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.004 },
        },
    },
});
