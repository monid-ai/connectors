import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAppleMapsReviewsQueryParams } from "./schema/inputs.ts";

/** GET /apple/maps/reviews — Get Apple Maps Reviews. */
export default defineEndpoint({
    meta: {
        displayName: "Get Apple Maps Reviews",
        summary: "Get the ratings summary and written reviews Apple Maps " +
            "attributes to one place.",
        description:
            "Fetch the ratings and reviews Apple attributes to one Apple Maps " +
            "place. Returns rating_summary, ratings (the star breakdown), " +
            "reviews (rating, text, date), place_info, and " +
            "search_information. Supports a locale for language and regional " +
            "formatting. Suited for reputation monitoring, " +
            "Apple-versus-Google review comparison, and place research.",
        docsUrl: "https://litescrape.com/docs/apple-maps-reviews",
        categories: ["maps"],
    },
    request: { method: "GET", path: "/apple/maps/reviews" },
    input: {
        schema: {
            queryParams: zAppleMapsReviewsQueryParams,
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
        /** v1 RESULT_GROUPS["/apple-maps/reviews"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "reviews",
                "rating_summary",
                "ratings",
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
