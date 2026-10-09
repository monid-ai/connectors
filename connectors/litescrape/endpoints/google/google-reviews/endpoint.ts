import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleReviewsQueryParams } from "./schema/inputs.ts";

/** GET /google/reviews — Get Google Reviews. */
export default defineEndpoint({
    meta: {
        displayName: "Get Google Reviews",
        summary:
            "Get Google Maps reviews for one place with sorting, filtering, " +
            "and paging.",
        description:
            "Fetch the reviews of one Google Maps place by place_id or " +
            "data_id. Returns reviews (rating, snippet, date, reviewer, " +
            "likes, images), topics Google groups them into, place_info, and " +
            "a next_page_token. Supports quality, newest, and rating " +
            "ordering, free-text or topic filtering, up to 100 reviews on the " +
            "first unfiltered request, and localization. Suited for sentiment " +
            "analysis, reputation monitoring, and competitor review mining.",
        docsUrl: "https://litescrape.com/docs/google-maps-reviews",
        categories: ["maps"],
        notes: [
            "Exactly one of `place_id` or `data_id`; a request with both or neither is rejected before the wire.",
            "Pass at most one of `query` or `topic_id`; `num` is capped at 20 on a filtered or continuation request. The vendor answers 400 to a violation.",
        ],
    },
    request: { method: "GET", path: "/google/reviews" },
    input: {
        schema: {
            queryParams: z.union([
                zGoogleReviewsQueryParams.required({ place_id: true }).omit({
                    data_id: true,
                }),
                zGoogleReviewsQueryParams.required({ data_id: true }).omit({
                    place_id: true,
                }),
            ]).describe("Provide exactly one of place_id or data_id."),
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
        /** v1 RESULT_GROUPS["/google/reviews"] through hasAnyResultGroup (design
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
