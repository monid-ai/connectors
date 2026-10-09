import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zDiscoverAiBody } from "./schema/inputs.ts";

/** POST /discover — company search from a natural-language prompt. */
export default defineEndpoint({
    meta: {
        displayName: "Search Companies by Prompt",
        summary:
            "Describe target companies in plain language; an AI picks the filters and runs the search.",
        description: "Natural-language company search: describe the " +
            "companies you want (e.g. 'European SaaS companies with " +
            "50-200 employees') and an upstream AI assistant translates " +
            "the description into structured filters and runs the " +
            "search. Returns up to 100 companies with domain, name, and " +
            "email counts — plus meta.filters, the translated structured " +
            "filter set. To paginate or refine, replay meta.filters on " +
            "/discover instead of re-translating: it is free and keeps " +
            "the filter set stable. Suited for kicking off prospecting " +
            "from a one-line brief.",
        docsUrl: "https://hunter.io/api-documentation/v2#discover",
        categories: ["company-enrichment"],
        notes: [
            "Each call spends one of the account's 50 AI translations per " +
            "month; the draw recorded here is that quota's price in " +
            "credits ($0.10 at $0.01196 per credit), not a vendor charge.",
        ],
    },
    /** PUBLIC identity (design D1): ONE upstream operation, TWO endpoints
     *  — the structured `/discover` and this natural-language leg, split
     *  because only this leg burns the account-wide AI quota. The id is
     *  v1's published one. */
    endpoint: "/discover-ai",
    request: { method: "POST", path: "/discover" },
    input: { schema: { body: zDiscoverAiBody } },
    usage: {
        /** The quota gate, in credits (owner decision 2026-09-17, design
         *  D6): v1 charged $0.10 per call as a gate on the account-wide
         *  50 AI translations a month; $0.10 ÷ $0.01196 per Scale-plan
         *  credit = 8.36 credits. The call itself is free upstream. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "AI searches",
            consumes: { credit: "default", amount: 8.36 },
        },
    },
});
