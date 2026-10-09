import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zYelpReviewsQueryParams } from "./schema/inputs.ts";

/** GET /yelp/reviews — Get Yelp Reviews. */
export default defineEndpoint({
    meta: {
        displayName: "Get Yelp Reviews",
        summary:
            "Get Yelp reviews for one business with language, rating, sort, " +
            "and paging controls.",
        description:
            "Fetch the reviews of one Yelp business by its place_id. Returns " +
            "reviews (rating, text, date, reviewer details), " +
            "review_languages, search_information, and pagination. Supports a " +
            "review language, six orderings (relevance, date, rating, " +
            "elites), a star-rating filter, a localized Yelp domain, and 1-49 " +
            "reviews per page. Suited for sentiment analysis, reputation " +
            "monitoring, and competitor review mining.",
        docsUrl: "https://litescrape.com/docs/yelp-reviews",
        categories: ["maps"],
    },
    request: { method: "GET", path: "/yelp/reviews" },
    input: {
        schema: {
            queryParams: zYelpReviewsQueryParams,
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
        /** v1 RESULT_GROUPS["/yelp/reviews"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "reviews",
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
