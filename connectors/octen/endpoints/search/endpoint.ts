import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zOctenSearchBody } from "./schema/inputs.ts";

/**
 * POST /search — minute-fresh web search.
 *
 * NATIVE usage: 1 call, plus full-content TOKENS when the gated tier fired
 * (`meta.usage.full_content_tokens` — only present with full_content.enable).
 * The `meta.usage` meter block is the billing receipt: absorbed into usage
 * (evidence keeps it verbatim).
 */
export default defineEndpoint({
    meta: {
        displayName: "Octen Web Search",
        summary: "Minute-fresh web search with filters and full content.",
        description: "Web search over the live internet with minute-level " +
            "freshness. Search the web and get ranked results (title, url, " +
            "highlight, authors, publish and crawl times, favicon), with " +
            "optional query-relevant highlights, domain include/exclude " +
            "filters, must/must-not text filters, publish/crawl time " +
            "windows, a news topic mode, and safesearch. Enable " +
            "full_content to return the complete page text for each result.",
        docsUrl: "https://docs.octen.ai/api-reference/search",
        categories: ["web-search", "news-search"],
    },
    request: { method: "POST", path: "/search" },
    input: { schema: { body: zOctenSearchBody } },
    usage: {
        /** Flat call fee AND gated full-content tokens (AND = COMPOSITE).
         *  Component ids spelled like octen's response fields (design D19)
         *  — no gate in the model: with full_content off the token count
         *  is simply absent (bills 0). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "call": {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                },
                "full_content_tokens": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.TOKEN,
                    label: "content tokens",
                    description:
                        "full-content extraction tokens (only charged " +
                        "when full_content.enable is set)",
                },
            },
        },
        /** Full-content tokens depend on PAGE CONTENT — not deducible from
         *  the input, so the metered key is promised at the deducible
         *  floor 0 (design D24); settle trues it up from
         *  `meta.usage.full_content_tokens`. The flat "call" is
         *  engine-appended, never promised here. */
        estimate: () => ({ counts: { "full_content_tokens": 0 } }),
        consolidate: ({ data, utils }) => {
            const tokens = utils.json.optionalNum(
                data.output,
                "$.meta.usage.full_content_tokens",
            );
            return {
                usage: {
                    // the flat "call" component is MODEL-declared — never a
                    // count (design D18)
                    counts: {
                        ...(tokens !== undefined
                            ? { "full_content_tokens": tokens }
                            : {}),
                    },
                    evidence: utils.json.pick(data.output, ["$.meta.usage"]),
                },
                output: utils.json.omit(data.output, ["usage"]),
            };
        },
    },
});
