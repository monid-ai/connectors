import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleSerpBody } from "./schema/inputs.ts";

/** Google SERP (sync) — one POST, results inline. */
export default defineEndpoint({
    meta: {
        displayName: "Search Google Results",
        summary:
            "Scrape live Google Search results for a query into structured JSON.",
        description: "Run a Google search and get the live SERP back as " +
            "structured JSON: organic results with title, URL, " +
            "description, and relevance, plus query metadata (result " +
            "count, search time, page title) and navigation tabs. Supports " +
            "region and language targeting and page-by-page pagination. " +
            "Suited for rank tracking, brand monitoring, competitive " +
            "research, and feeding search results into agent research " +
            "loops.",
        docsUrl: "https://docs.mrscraper.com/docs/features/marketplace",
        categories: ["web-search"],
    },
    /** PUBLIC identity (design D1): the wire path is the vendor's
     *  versioned transport (`/api/google/serp/v2/sync`); the id is v1's
     *  published one. */
    endpoint: "/serp/google",
    request: { method: "POST", path: "/api/google/serp/v2/sync" },
    input: {
        schema: { body: zGoogleSerpBody },
        /** `format: "json"` pinned on every request: the upstream's
         *  default flipped to `html` (the raw results page) on 2026-09-02
         *  (v1 syncPostStart; design D2). */
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, { format: "json" }),
        }),
    },
    usage: {
        /** 1 token per run — v1's drill-verified rate (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "runs",
            description: "runs that returned usable data",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
