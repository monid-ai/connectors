import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleAdsQueryParams } from "./schema/inputs.ts";

/** GET /google/ads — Find Google Ads. */
export default defineEndpoint({
    meta: {
        displayName: "Find Google Ads",
        summary:
            "Get the paid search, local, and shopping ads Google shows for a " +
            "query at a location.",
        description:
            "Run a Google search from a named location and keep the whole " +
            "results page with its ad units. Returns ads and local_ads " +
            "(position, title, link, address), shopping_results (position, " +
            "title, price), organic_results, related_questions, and any other " +
            "result group Google renders. Supports language, safe search, " +
            "auto-correction control, and device layout. Suited for " +
            "competitor ad monitoring, paid-search auditing, and SEM " +
            "research.",
        docsUrl: "https://litescrape.com/docs/google-ads",
        categories: ["seo"],
        notes: [
            "Alpha upstream (litescrape.com/docs, 2026-09-20): result groups and field availability may change.",
        ],
    },
    request: { method: "GET", path: "/google/ads" },
    input: {
        schema: {
            queryParams: zGoogleAdsQueryParams,
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
        /** v1 RESULT_GROUPS["/google/ads"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "ads",
                "local_ads",
                "shopping_results",
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
