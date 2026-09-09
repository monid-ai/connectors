import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
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
        /** Receipt queries AND gated full-content tokens (AND = COMPOSITE).
         *  Component ids spelled like octen's response fields (design D19).
         *  TWO metered components ⇒ the compiler requires this doc to own
         *  both fns (the generic keying can't choose between them). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                "receipt_queries": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    description: "executed sub-query searches",
                },
                "full_content_tokens": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.TOKEN,
                    description:
                        "full-content extraction tokens (only charged " +
                        "when search_options.full_content.enable is set)",
                },
            },
        },
        /** Queries = the requested max_queries (schema default 5 — the v1
         *  fallback rule, applied at parse time). Tokens are NOT promisable
         *  from the input (page-content-sized) — omitted, settle trues them
         *  up. */
        estimate: ({ data }) => ({
            counts: { "receipt_queries": data.input.body.max_queries },
        }),
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
                    counts: {
                        "receipt_queries": queries,
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
