import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleAiOverviewQueryParams } from "./schema/inputs.ts";

/** GET /google/ai-overview — Get AI Overview. */
export default defineEndpoint({
    meta: {
        displayName: "Get AI Overview",
        summary:
            "Get Google's AI Overview for a query, or a free 404 when Google " +
            "generates none.",
        description:
            "Run a Google search and wait for the AI Overview module. Returns " +
            "ai_overview (text_blocks with snippets and the sources they " +
            "cite) plus search_metadata and the normalized search_parameters. " +
            "Supports the full Google Search contract: query or entity " +
            "(ludocid, kgmid), localization, a named or coordinate origin, " +
            "verticals, date and safe-search filters, and advanced operators. " +
            "Answers a 404 that is not charged when Google shows no overview; " +
            "allow up to 120 seconds. For the full results page with the same " +
            "parameters use google/search. Suited for AI-answer monitoring, " +
            "citation tracking, and GEO research.",
        docsUrl: "https://litescrape.com/docs/google-ai-overview",
        categories: ["ai-search"],
        notes: [
            "Pass at least one of `q`, `ludocid`, or `kgmid`; a request with none is rejected before the wire.",
            "`lat` and `lon` travel together, and neither can be combined with `location` or `uule`; `as_nlo` and `as_nhi` travel together; `as_dt` requires `as_sitesearch`; `radius` above 199 needs `device` tablet or mobile. The vendor answers 400 to a violation.",
            "When Google generates no overview the upstream answers 404 `not_found` without charging a credit; the run settles as a provider error with zero usage.",
        ],
    },
    request: { method: "GET", path: "/google/ai-overview" },
    input: {
        schema: {
            queryParams: z.union([
                zGoogleAiOverviewQueryParams.required({ q: true }),
                zGoogleAiOverviewQueryParams.required({ ludocid: true }),
                zGoogleAiOverviewQueryParams.required({ kgmid: true }),
            ]).describe("Provide at least one of q, ludocid, or kgmid."),
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
        /** v1 RESULT_GROUPS["/google/ai-overview"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "ai_overview",
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
