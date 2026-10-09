import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGptWebSearchBody } from "./schema/inputs.ts";

/** POST /api/gpt/websearch/sync — GPT Web Search. */
export default defineEndpoint({
    meta: {
        displayName: "GPT Web Search",
        summary:
            "Answer a question with GPT plus live web search, returned as sourced Markdown.",
        description:
            "Run a GPT web search for a natural-language question and " +
            "receive a grounded answer. Returns the original query and the " +
            "answer text in Markdown with inline numbered source links " +
            "appended. Supports a country code to localize the search. " +
            "Fixed price per question. Suited for research questions that " +
            "need current web sources, competitive lookups, and " +
            "fact-checking with citations.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["ai-search"],
    },
    /** PUBLIC identity (design D1): the wire path is the vendor's
     *  transport; the id is v1's published one. */
    endpoint: "/gpt/web-search",
    request: { method: "POST", path: "/api/gpt/websearch/sync" },
    input: { schema: { body: zGptWebSearchBody } },
    usage: {
        /** 25 tokens per run — the vendor's marketplace card via v1
         *  (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 25 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
