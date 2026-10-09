import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGooglePlayMoviesQueryParams } from "./schema/inputs.ts";

/** GET /google/play/movies — Search Play Movies. */
export default defineEndpoint({
    meta: {
        displayName: "Search Play Movies",
        summary:
            "Search or browse movies, TV shows, episodes, categories, and " +
            "charts on Google Play.",
        description:
            "Search Google Play Movies & TV or browse its storefront. Returns " +
            "organic_results grouped by format (movies, TV shows, episodes) " +
            "with title, product_id, rating, and price, charts, and " +
            "litescrape_pagination tokens. Supports a query, a native " +
            "category, a children's age range, charts, and continuation " +
            "tokens. Suited for streaming catalog research and chart " +
            "tracking.",
        docsUrl: "https://litescrape.com/docs/google-play-movies",
        categories: ["app-stores"],
        notes: [
            "Alpha upstream (litescrape.com/docs, 2026-09-20): result groups and field availability may change.",
            "Pass at most one of `chart`, `next_page_token`, `section_page_token`, or `see_more_token`; `chart` cannot be combined with `q`; `q` cannot be combined with the category parameter. The vendor answers 400 to a violation.",
            "`age` requires `movies_category` 'FAMILY'.",
        ],
    },
    request: { method: "GET", path: "/google/play/movies" },
    input: {
        schema: {
            queryParams: zGooglePlayMoviesQueryParams,
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
        /** v1 RESULT_GROUPS["/google-play/movies"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "organic_results",
                "charts",
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
