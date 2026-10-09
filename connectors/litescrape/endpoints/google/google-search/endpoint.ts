import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleSearchQueryParams } from "./schema/inputs.ts";

/** GET /google/search — Search Google. */
export default defineEndpoint({
    meta: {
        displayName: "Search Google",
        summary:
            "Run a Google search and get organic results, Knowledge Graph, " +
            "and related searches.",
        description:
            "Search Google and get the parsed results page as JSON. Returns " +
            "organic_results (position, title, link, displayed_link, " +
            "snippet), knowledge_graph when Google shows a panel, " +
            "related_searches, related_questions, local_results, ai_overview " +
            "when Google generates one, and search_information. Supports " +
            "localization (gl, hl, google_domain, device), a named location, " +
            "uule, or lat/lon origin, verticals (news, video, shopping, " +
            "local, patents), date and safe-search filters, advanced " +
            "operators (exact phrase, exclusions, site restriction, numeric " +
            "range), paging with start and num, and fast_mode for organic " +
            "results only. For only the AI Overview of the same query use " +
            "google/ai-overview; for the reviews of a local result pass its " +
            "place_id to google/reviews. Suited for rank tracking, brand " +
            "monitoring, competitive research, and agent research loops.",
        docsUrl: "https://litescrape.com/docs/google-search",
        categories: ["web-search"],
        notes: [
            "Pass at least one of `q`, `ludocid`, or `kgmid`; a request with none is rejected before the wire.",
            "`lat` and `lon` travel together, and neither can be combined with `location` or `uule`; `as_nlo` and `as_nhi` travel together; `as_dt` requires `as_sitesearch`; `radius` above 199 needs `device` tablet or mobile. The vendor answers 400 to a violation.",
        ],
    },
    request: { method: "GET", path: "/google/search" },
    input: {
        schema: {
            queryParams: z.union([
                zGoogleSearchQueryParams.required({ q: true }),
                zGoogleSearchQueryParams.required({ ludocid: true }),
                zGoogleSearchQueryParams.required({ kgmid: true }),
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
        /** v1 RESULT_GROUPS["/google/search"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "organic_results",
                "knowledge_graph",
                "ai_overview",
                "local_results",
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
