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
        /** Flat call fee AND gated full-content tokens (AND = COMPOSITE). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: [
                { kind: UsageModelKind.PER_CALL },
                { kind: UsageModelKind.PER_UNIT, unit: Unit.TOKEN },
            ],
        },
        consolidate: ({ data, utils }) => {
            const tokens = utils.json.optionalNum(
                data.output,
                "$.meta.usage.full_content_tokens",
            );
            return {
                usage: {
                    units: [
                        // the flat call component is MODEL-declared
                        // (COMPOSITE [PER_CALL, PER_UNIT·TOKEN]) — never a
                        // measure (design D18)
                        ...(tokens !== undefined
                            ? [{ amount: tokens, unit: "TOKEN" as const }]
                            : []),
                    ],
                    evidence: utils.json.pick(data.output, ["$.meta.usage"]),
                },
                output: utils.json.omit(data.output, ["usage"]),
            };
        },
    },
});
