import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAppleAppStoreSearchQueryParams } from "./schema/inputs.ts";

/** GET /apple/app-store/search — Search App Store. */
export default defineEndpoint({
    meta: {
        displayName: "Search App Store",
        summary:
            "Search iPhone, iPad, and Mac apps or developers on the Apple App " +
            "Store by storefront.",
        description:
            "Search the Apple App Store for apps or developers in one " +
            "storefront country. Returns organic_results (title, id, " +
            "developer, price, rating, rating count, genres, release date, " +
            "languages, screenshots, supported devices) and " +
            "search_information. Supports a storefront country and language, " +
            "iPhone, iPad, or Mac apps, a developer-name match, a genre " +
            "filter, explicit-content exclusion, and 1-200 results. For one " +
            "app's details pass the id from a result as product_id to " +
            "apple/app-store/product. Suited for app discovery, competitor " +
            "mapping, and category research.",
        docsUrl: "https://litescrape.com/docs/apple-app-store-search",
        categories: ["app-stores"],
        notes: [
            "Alpha upstream (litescrape.com/docs, 2026-09-20): result groups and field availability may change.",
        ],
    },
    request: { method: "GET", path: "/apple/app-store/search" },
    input: {
        schema: {
            queryParams: zAppleAppStoreSearchQueryParams,
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
        /** v1 RESULT_GROUPS["/app-store/search"] through hasAnyResultGroup (design
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
