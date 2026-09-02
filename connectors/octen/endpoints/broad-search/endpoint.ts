import { defineEndpoint } from "@shared/core";
import { zOctenBroadSearchBody } from "./schema/inputs.ts";

/**
 * POST /broad-search — multi-angle search.
 *
 * NATIVE usage: executed sub-queries (`meta.usage.num_search_queries`;
 * falls back to the requested max_queries ?? 5 when the receipt is absent —
 * the v1 rule) plus the gated full-content token tier.
 */
export default defineEndpoint({
    meta: {
        displayName: "Octen Broad Search",
        summary: "One query, up to 30 parallel sub-query searches.",
        description: "Multi-angle web search: decomposes one query into up " +
            "to 30 related sub-queries (max_queries, default 5), runs them " +
            "in parallel, and returns results grouped by sub-query (not " +
            "de-duplicated across groups). Accepts the same per-sub-query " +
            "search options as Web Search (domains, text filters, time " +
            "windows, highlights, full content, news topic, safesearch) " +
            "via search_options. Use this instead of Web Search when one " +
            "query has several distinct angles worth searching separately.",
        docsUrl: "https://docs.octen.ai/api-reference/broad-search",
        categories: ["web-search"],
    },
    request: { method: "POST", path: "/broad-search" },
    input: { schema: { body: zOctenBroadSearchBody } },
    usage: {
        consolidate: ({ data, utils }) => {
            const queries = utils.json.optionalNum(
                data.output,
                "$.meta.usage.num_search_queries",
            ) ??
                utils.json.optionalNum(
                    data.input.body ?? {},
                    "$.max_queries",
                ) ?? 5;
            const tokens = utils.json.optionalNum(
                data.output,
                "$.meta.usage.full_content_tokens",
            );
            return {
                usage: {
                    units: [
                        { amount: queries, unit: "result" as const },
                        ...(tokens !== undefined
                            ? [{ amount: tokens, unit: "token" as const }]
                            : []),
                    ],
                    evidence: utils.json.pick(data.output, ["$.meta.usage"]),
                },
                output: utils.json.omit(data.output, ["usage"]),
            };
        },
    },
});
