import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGooglePlayReviewsQueryParams } from "./schema/inputs.ts";

/** GET /google/play/reviews — Get Play Reviews. */
export default defineEndpoint({
    meta: {
        displayName: "Get Play Reviews",
        summary: "Get Google Play reviews for a product with rating, sort, " +
            "platform, and paging.",
        description:
            "Page through the reviews of one Google Play product. Returns " +
            "reviews (id, title, rating, snippet, likes, date, app version, " +
            "developer response) and litescrape_pagination with the " +
            "next_page_token. Supports the apps, books, audiobooks, movies, " +
            "and tv catalogs, a platform filter, a single star rating, " +
            "relevance, newest, or rating order, 1-199 reviews per call, and " +
            "storefront localization. Suited for sentiment analysis, " +
            "feature-request mining, and release monitoring.",
        docsUrl: "https://litescrape.com/docs/google-play-reviews",
        categories: ["app-stores"],
        notes: [
            "Alpha upstream (litescrape.com/docs, 2026-09-20): result groups and field availability may change.",
        ],
    },
    request: { method: "GET", path: "/google/play/reviews" },
    input: {
        schema: {
            queryParams: zGooglePlayReviewsQueryParams,
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
        /** v1 RESULT_GROUPS["/google-play/reviews"] through hasAnyResultGroup (design
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
