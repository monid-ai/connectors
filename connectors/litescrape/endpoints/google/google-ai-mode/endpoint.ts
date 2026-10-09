import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleAiModeQueryParams } from "./schema/inputs.ts";

/** GET /google/ai-mode — Ask Google AI Mode. */
export default defineEndpoint({
    meta: {
        displayName: "Ask Google AI Mode",
        summary:
            "Ask Google AI Mode a question and get its generated answer with " +
            "cited sources.",
        description:
            "Send a question to Google's AI Mode surface. Returns text_blocks " +
            "(ordered paragraphs and lists) and references (index, source, " +
            "link) the answer cites, plus a subsequent_request_token when " +
            "continuable. Supports follow-up questions within 30 minutes, an " +
            "image_url sent through Google Lens, a named location or uule, " +
            "and localization (gl, hl, google_domain, device). Answers are " +
            "generated per request and vary between calls; allow up to 120 " +
            "seconds. Suited for AI-answer research, citation tracking, and " +
            "conversational lookups.",
        docsUrl: "https://litescrape.com/docs/google-ai-mode",
        categories: ["ai-search"],
        notes: [
            "Pass at most one of `location` or `uule`; the vendor answers 400 to both.",
            "Pass at most one of `image_url` or `subsequent_request_token`; a follow-up needs a new `q`. The vendor answers 400 to a violation.",
        ],
    },
    request: { method: "GET", path: "/google/ai-mode" },
    input: {
        schema: {
            queryParams: zGoogleAiModeQueryParams,
        },
    },
    usage: {
        /** One Litescrape credit per call that returned a result group —
         *  the flat card cited in provider.ts (design D2), counted 0|1 by
         *  the evidence below (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "calls with results",
            description: "calls whose response carried a result group",
            consumes: { credit: "default", amount: 1 },
        },
        // estimate is inherited: the provider promises one call
        /** v1 RESULT_GROUPS["/google/ai-mode"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "text_blocks",
            ];
            const body = data.output;
            let hit = 0;
            if (
                typeof body === "object" && body !== null &&
                !Array.isArray(body)
            ) {
                for (const key of groups) {
                    const value = (body as Record<string, unknown>)[key];
                    if (value === null || value === undefined) continue;
                    if (Array.isArray(value)) {
                        if (value.length > 0) hit = 1;
                        continue;
                    }
                    if (typeof value === "string") {
                        if (value.length > 0) hit = 1;
                        continue;
                    }
                    if (typeof value === "object") {
                        if (Object.keys(value).length > 0) hit = 1;
                        continue;
                    }
                    hit = 1;
                }
            }
            return { counts: { RESULT: hit } };
        },
    },
});
