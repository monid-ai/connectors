import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGooglePlayProductQueryParams } from "./schema/inputs.ts";

/** GET /google/play/product — Get Play Product. */
export default defineEndpoint({
    meta: {
        displayName: "Get Play Product",
        summary:
            "Read a Google Play app, book, audiobook, movie, or TV product " +
            "with ratings and downloads.",
        description:
            "Read one Google Play product page by its native id. Returns " +
            "product_info (title, developer, downloads, download_count, " +
            "content rating), about_this_app, media, ratings (star " +
            "breakdown), sample reviews, data_safety, permissions, " +
            "what_s_new, similar_results, and format-specific fields such as " +
            "authors, cast, seasons, and episodes. Supports the apps, books, " +
            "audiobooks, movies, and tv catalogs, a season id for TV, and " +
            "storefront language and country. To page through the product's " +
            "reviews pass the same product_id and store to " +
            "google/play/reviews. Suited for app intelligence, install " +
            "estimates, and competitor profiling.",
        docsUrl: "https://litescrape.com/docs/google-play-product",
        categories: ["app-stores"],
        notes: [
            "Alpha upstream (litescrape.com/docs, 2026-09-20): result groups and field availability may change.",
            "`season_id` requires `store` 'tv'; the vendor answers 400 otherwise.",
        ],
    },
    request: { method: "GET", path: "/google/play/product" },
    input: {
        schema: {
            queryParams: zGooglePlayProductQueryParams,
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
        /** v1 RESULT_GROUPS["/google-play/product"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "product_info",
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
