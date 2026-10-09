import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSearchBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Web Search",
        summary:
            "Search the web and optionally scrape each result to Markdown in one call.",
        description: "Run a web search and get ranked results (url, title, " +
            "description, relevance) back, with optional inline Markdown " +
            "for every result so an agent gets answers in a single " +
            "round-trip. The query accepts natural language and " +
            "Google-style operators (site:, -site:, inurl:, intitle:, " +
            "quoted phrases, OR). Filters cover result count (10-100), " +
            "domain allow/block lists, publication freshness windows, " +
            "country localization, and query fan-out for broader recall. " +
            "markdownOptions mirrors the scrape family's controls.",
        docsUrl: "https://docs.context.dev/api-reference/web-scraping/search",
        categories: ["web-search"],
        notes: [
            "Enabling markdownOptions scrapes each result and consumes " +
            "additional credits upstream; the response's own credit count " +
            "settles it.",
        ],
    },
    request: { method: "POST", path: "/web/search" },
    // `numResults` REQUIRED at the binding (design D25): it is the
    // estimate's whole basis, so the caller states it.
    input: { schema: { body: zSearchBody.required({ numResults: true }) } },
    // search alone is fast; with markdownOptions.enabled it scrapes every
    // result in the same call (v1's budget)
    timeouts: { requestMs: 310_000, runMs: 310_000 },
    usage: {
        /** 1 credit per 10 results — https://www.context.dev/pricing
         *  (2026-09-17, "1 / ten_results"), a BLOCK rate the vendor's own
         *  meter confirmed in v1's drills (9 results → 1 credit, 19 → 2),
         *  so `every: 10` with the fold's ceil is the vendor's arithmetic. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            every: 10,
            label: "results",
            description: "search results returned, billed per block of ten",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: ({ data }) => ({
            counts: { RESULT: data.input.body.numResults },
        }),
        evidence: ({ data, utils }) => ({
            counts: {
                RESULT: utils.json.len(data.output, "$.results"),
            },
        }),
    },
});
