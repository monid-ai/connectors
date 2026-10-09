import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleContributorReviewsQueryParams } from "./schema/inputs.ts";

/** GET /google/contributor-reviews — Get Contributor Reviews. */
export default defineEndpoint({
    meta: {
        displayName: "Get Contributor Reviews",
        summary:
            "Get up to 200 reviews written by one Google Maps contributor.",
        description:
            "Fetch the review history of one Google Maps contributor profile. " +
            "Returns contributor (name and profile details), " +
            "search_information, and reviews, each with the reviewed place " +
            "(place_info), rating, snippet, and date. Supports a limit of " +
            "1-200 reviews in one call and localization. Suited for reviewer " +
            "credibility checks, fake-review investigation, and local-guide " +
            "research.",
        docsUrl: "https://litescrape.com/docs/google-contributor-reviews",
        categories: ["maps"],
    },
    request: { method: "GET", path: "/google/contributor-reviews" },
    input: {
        schema: {
            queryParams: zGoogleContributorReviewsQueryParams,
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
        /** v1 RESULT_GROUPS["/google/contributor-reviews"] through hasAnyResultGroup (design
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
