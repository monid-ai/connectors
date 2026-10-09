import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAppleAppStoreReviewsQueryParams } from "./schema/inputs.ts";

/** GET /apple/app-store/reviews — Get App Store Reviews. */
export default defineEndpoint({
    meta: {
        displayName: "Get App Store Reviews",
        summary: "Read Apple App Store reviews for an app in one storefront " +
            "country, page by page.",
        description:
            "Page through the reviews of one Apple App Store app in a " +
            "storefront country. Returns reviews (title, rating, text, " +
            "author, date, version), search_information (total pages, reviews " +
            "for the current version), and litescrape_pagination. Supports " +
            "most-recent or most-helpful ordering and one-based paging; iOS " +
            "pages hold 25 reviews, Mac pages 10. Suited for sentiment " +
            "analysis by country, release feedback, and competitor review " +
            "mining.",
        docsUrl: "https://litescrape.com/docs/apple-app-store-reviews",
        categories: ["app-stores"],
        notes: [
            "Alpha upstream (litescrape.com/docs, 2026-09-20): result groups and field availability may change.",
            "A page past the end answers 200 with `reviews: []`; that run records 0 credits here although the vendor deducts one.",
        ],
    },
    request: { method: "GET", path: "/apple/app-store/reviews" },
    input: {
        schema: {
            queryParams: zAppleAppStoreReviewsQueryParams,
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
        /** v1 RESULT_GROUPS["/app-store/reviews"] through hasAnyResultGroup (design
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
