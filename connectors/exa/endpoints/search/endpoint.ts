import { defineEndpoint } from "@shared/core";
import { zExaSearchBody } from "./schema/inputs.ts";

/**
 * Exa /search — neural + keyword search across the open web.
 *
 * usage.consolidate settles the RAW response in one move: units = result
 * count; Exa's real cost arrives on `costDollars.total` (usd, sometimes
 * absent → optionalNum) — converted to micro-dollars for billing, receipts
 * kept as `evidence`, and the loose vendor billing field absorbed out of the
 * payload (one shape, not two). Fn bodies are closed terms (unit names are
 * string literals; imports would fail the compiler lint).
 */
export default defineEndpoint({
    meta: {
        displayName: "Exa Search",
        summary: "Search the web with Exa's neural + keyword search.",
        description: "Search the web with Exa's neural + keyword search. " +
            "Finds pages by meaning rather than keyword overlap — phrase the " +
            "query as a description of the page you are looking for. Supports " +
            "search types ('auto', 'instant', 'fast', 'neural', 'deep-lite', " +
            "'deep', 'deep-reasoning'), categories ('company', 'research " +
            "paper', 'news', 'personal site', 'financial report'), domain " +
            "filters, published-date ranges, and inline contents extraction " +
            "(text/highlights/summary). Returns a list of result URLs with " +
            "optional content.",
        docsUrl: "https://exa.ai/docs/reference/search",
        categories: ["web-search"],
    },
    request: { method: "POST", path: "/search" },
    input: {
        schema: { body: zExaSearchBody },
        // exa rejects `stream`; the schema doesn't expose it, but it is
        // non-strict (newer exa params pass through) — strip as defense-in-depth.
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.omit(data.input.body ?? {}, ["stream"]),
        }),
    },
    usage: {
        consolidate: ({ data, utils }) => {
            const total = utils.json.optionalNum(
                data.output,
                "$.costDollars.total",
            );
            return {
                usage: {
                    units: [{
                        amount: utils.json.len(data.output, "$.results"),
                        unit: "result",
                    }],
                    ...(total !== undefined
                        ? { cost: utils.money.fromDollars(total) }
                        : {}),
                    evidence: utils.json.pick(data.output, [
                        "$.costDollars",
                        "$.requestId",
                    ]),
                },
                output: utils.json.omit(data.output, ["costDollars"]),
            };
        },
    },
});
