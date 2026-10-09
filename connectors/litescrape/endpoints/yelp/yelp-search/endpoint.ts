import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYelpSearchQueryParams } from "./schema/inputs.ts";

/** GET /yelp/search — Search Yelp. */
export default defineEndpoint({
    meta: {
        displayName: "Search Yelp",
        summary:
            "Search Yelp businesses by location, category, terms, map area, " +
            "and sort order.",
        description: "Search Yelp for businesses in a location. Returns " +
            "organic_results (position, name, rating, review count, " +
            "categories, price, address, phone, and the place_id for the " +
            "reviews endpoint), ads_results, filters, and pagination. " +
            "Supports search terms or a category, recommended, rating, or " +
            "review-count ordering, Yelp attribute filters, a map-bounds " +
            "token, a localized Yelp domain, and offset paging. For a " +
            "business's reviews pass its place_id to yelp/reviews. Suited for " +
            "local lead lists, competitor discovery, and review sourcing.",
        docsUrl: "https://litescrape.com/docs/yelp-search",
        categories: ["maps"],
    },
    request: { method: "GET", path: "/yelp/search" },
    input: {
        schema: {
            queryParams: zYelpSearchQueryParams,
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
        /** v1 RESULT_GROUPS["/yelp/search"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "organic_results",
                "ads_results",
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
