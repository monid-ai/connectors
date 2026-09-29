import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsKeywordOverviewBody } from "./schema/inputs.ts";

/**
 * Keyword Overview — `POST /v3/dataforseo_labs/google/keyword_overview/live`
 * (v1 `/labs/keyword-overview`). Per-row: $0.012 per request plus $0.00012
 * per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Keyword Overview",
        summary:
            "Get volume, CPC, difficulty, intent, and SERP info for up to " +
            "700 keywords.",
        description:
            "Full keyword profile for a keyword list: search volume and " +
            "monthly searches, CPC, competition, keyword difficulty, " +
            "search intent, SERP features present, backlink averages of " +
            "top results, and clickstream and Bing normalised volumes on " +
            "request. Supports location and language. Suited as the " +
            "one-call keyword metrics lookup. To find the location_code " +
            "and language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_overview/live/",
        categories: ["seo"],
        notes: [
            "include_clickstream_data doubles the price of the call.",
        ],
    },
    endpoint: "/labs/keyword-overview",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/google/keyword_overview/live",
    },
    input: { schema: { body: zLabsKeywordOverviewBody } },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                base_fee: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 0.012 },
                    label: "base fee",
                    description: "the per-request fee",
                },
                rows: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.00012 },
                    label: "rows",
                    description: "items returned (result[0].items, or its " +
                        "items_count when the items were not returned)",
                },
            },
        },
        // include_clickstream_data doubles the call: the rows twice
        // plus a second base fee, which is 100 rows at this card
        estimate: ({ data }) => {
            const calls = data.input.body.include_clickstream_data ? 2 : 1;
            return {
                counts: {
                    rows: calls * data.input.body.keywords.length +
                        (calls - 1) * 100,
                },
            };
        },
    },
});
