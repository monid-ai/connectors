import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGeminiAskBody } from "./schema/inputs.ts";

/** POST /api/gemini/sync — Ask Gemini. */
export default defineEndpoint({
    meta: {
        displayName: "Ask Gemini",
        summary:
            "Ask Google Gemini a question and get its answer back as Markdown text.",
        description:
            "Send a natural-language question to Google Gemini and receive " +
            "the generated answer. Returns the original query and the " +
            "answer text in Markdown. Fixed price per question regardless " +
            "of answer length. Suited for quick research lookups, product " +
            "comparisons, and general-knowledge questions where an " +
            "AI-written answer is wanted instead of a list of links.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["ai-search"],
    },
    /** PUBLIC identity (design D1): the wire path is the vendor's
     *  transport; the id is v1's published one. */
    endpoint: "/gemini/ask",
    request: { method: "POST", path: "/api/gemini/sync" },
    input: { schema: { body: zGeminiAskBody } },
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
