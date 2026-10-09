import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGooglePlayGamesQueryParams } from "./schema/inputs.ts";

/** GET /google/play/games — Browse Play Games. */
export default defineEndpoint({
    meta: {
        displayName: "Browse Play Games",
        summary:
            "Browse Google Play games by category, device storefront, or " +
            "chart, or search Android apps.",
        description:
            "Browse the Google Play games storefront or its charts. Returns " +
            "organic_results (title, product_id, developer, rating, price, " +
            "icon), items_highlight, charts, and litescrape_pagination " +
            "tokens. Supports a games category, a chart (top free, top paid, " +
            "top grossing), device storefronts including Windows, " +
            "continuation tokens, and a q that runs the shared Android app " +
            "search. Suited for game market research and chart tracking.",
        docsUrl: "https://litescrape.com/docs/google-play-games",
        categories: ["app-stores"],
        notes: [
            "Alpha upstream (litescrape.com/docs, 2026-09-20): result groups and field availability may change.",
            "Pass at most one of `chart`, `next_page_token`, `section_page_token`, or `see_more_token`; `chart` cannot be combined with `q`; `q` cannot be combined with the category parameter. The vendor answers 400 to a violation.",
            "An explicit `store_device` cannot be combined with `q` or the category; a `chart` needs the phone storefront (omit `store_device` or set 'phone').",
        ],
    },
    request: { method: "GET", path: "/google/play/games" },
    input: {
        schema: {
            queryParams: zGooglePlayGamesQueryParams,
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
        /** v1 RESULT_GROUPS["/google-play/games"] through hasAnyResultGroup (design
         *  D3, owner 2026-09-20): 1 when the 2xx body carries one of this
         *  endpoint's result groups as a non-empty array, string, or
         *  object, or a non-null scalar; 0 for an empty success — the
         *  vendor still deducts the credit, v1's posture absorbs it. */
        evidence: ({ data }) => {
            const groups = [
                "organic_results",
                "app_highlight",
                "items_highlight",
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
