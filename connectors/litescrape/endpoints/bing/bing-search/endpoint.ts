import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBingSearchQueryParams } from "./schema/inputs.ts";

/** GET /bing/search — Search Bing. */
export default defineEndpoint({
    meta: {
        displayName: "Search Bing",
        summary:
            "Run a Bing web search and get organic results, knowledge cards, " +
            "and paging.",
        description: "Search Bing and get the parsed results page. Returns " +
            "organic_results (position, title, link, snippet), " +
            "knowledge_graph cards, search_information, and pagination with " +
            "the next page as a ready-made request. Supports a market or " +
            "country, a named location or coordinates, Bing's native filter " +
            "expressions, safe search, a one-based offset, and device layout. " +
            "Suited for rank tracking outside Google, cross-engine " +
            "comparison, and research loops.",
        docsUrl: "https://litescrape.com/docs/bing-search",
        categories: ["web-search"],
        notes: [
            "Pass at most one of `mkt` or `cc`; the vendor answers 400 to both.",
        ],
    },
    request: { method: "GET", path: "/bing/search" },
    input: {
        schema: {
            queryParams: zBingSearchQueryParams,
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
        /** v1 RESULT_GROUPS["/bing/search"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "organic_results",
                "knowledge_graph",
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
