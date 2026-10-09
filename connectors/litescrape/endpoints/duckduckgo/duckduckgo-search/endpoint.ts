import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zDuckDuckGoSearchQueryParams } from "./schema/inputs.ts";

/** GET /duckduckgo/search — Search DuckDuckGo. */
export default defineEndpoint({
    meta: {
        displayName: "Search DuckDuckGo",
        summary:
            "Run a DuckDuckGo web search with region, safe-search, date, and " +
            "paging controls.",
        description: "Search DuckDuckGo and get its organic results. Returns " +
            "organic_results (position, title, link, snippet) with " +
            "pagination. Supports a region-language token, three safe-search " +
            "levels, a date window, an offset, and 1-50 results per call. " +
            "Suited for privacy-oriented cross-engine comparison and research " +
            "loops.",
        docsUrl: "https://litescrape.com/docs/duckduckgo-search",
        categories: ["web-search"],
        notes: [
            "Pass at most one of `m` or `search_assist`; the vendor answers 400 to both.",
        ],
    },
    request: { method: "GET", path: "/duckduckgo/search" },
    input: {
        schema: {
            queryParams: zDuckDuckGoSearchQueryParams,
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
        /** v1 RESULT_GROUPS["/duckduckgo/search"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "organic_results",
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
