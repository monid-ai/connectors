import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTripadvisorReviewsQueryParams } from "./schema/inputs.ts";

/** GET /tripadvisor/reviews — Get Tripadvisor Reviews. */
export default defineEndpoint({
    meta: {
        displayName: "Get Tripadvisor Reviews",
        summary:
            "Get Tripadvisor reviews for one place with sorting, translation, " +
            "and paging.",
        description:
            "Fetch the reviews of one Tripadvisor place by its id. Returns " +
            "reviews (title, text, rating, date, trip type, reviewer " +
            "details), sort, search_information, and pagination. Supports " +
            "recent or relevance ordering, machine translation into the " +
            "locale, a localized domain, and 1-50 reviews per page. Suited " +
            "for hotel and restaurant sentiment analysis and competitor " +
            "review mining.",
        docsUrl: "https://litescrape.com/docs/tripadvisor-reviews",
        categories: ["maps", "hotels"],
    },
    request: { method: "GET", path: "/tripadvisor/reviews" },
    input: {
        schema: {
            queryParams: zTripadvisorReviewsQueryParams,
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
        /** v1 RESULT_GROUPS["/tripadvisor/reviews"] through hasAnyResultGroup (design
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
