import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAppleAppStoreProductQueryParams } from "./schema/inputs.ts";

/** GET /apple/app-store/product — Get App Store Product. */
export default defineEndpoint({
    meta: {
        displayName: "Get App Store Product",
        summary:
            "Read an iOS or Mac app's details, version history, ratings, " +
            "privacy, and related apps.",
        description:
            "Read one Apple App Store app page by its id in one storefront " +
            "country. Returns title, developer, price, in_app_purchases, " +
            "rating and rating_count, description, iphone_screenshots and " +
            "ipad_screenshots, version_history (version, notes, date), " +
            "ratings_and_reviews, privacy disclosures, information, " +
            "age_rating, featured_in, more_by_this_developer, and " +
            "you_may_also_like. Supports the storefront country. To page " +
            "through the app's reviews pass the same product_id and country " +
            "to apple/app-store/reviews. Suited for app intelligence, release " +
            "tracking, and competitor profiling by country.",
        docsUrl: "https://litescrape.com/docs/apple-app-store-product",
        categories: ["app-stores"],
        notes: [
            "Alpha upstream (litescrape.com/docs, 2026-09-20): result groups and field availability may change.",
        ],
    },
    request: { method: "GET", path: "/apple/app-store/product" },
    input: {
        schema: {
            queryParams: zAppleAppStoreProductQueryParams,
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
        /** v1 RESULT_GROUPS["/app-store/product"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "title",
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
