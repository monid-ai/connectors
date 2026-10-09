import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsHistoricalKeywordDataBody } from "./schema/inputs.ts";

/**
 * Historical Keyword Data — `POST
 * /v3/dataforseo_labs/google/historical_keyword_data/live` (v1
 * `/labs/historical-keyword-data`). Per-row: $0.012 per request plus
 * $0.00012 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Historical Keyword Data",
        summary: "Get monthly historical search volume and CPC for up to 700 " +
            "keywords.",
        description:
            "Historical keyword metrics for a keyword list: per keyword " +
            "and month the search volume, CPC, and competition back to " +
            "2019. Supports location and language. Suited for demand " +
            "history beyond the 12 months Google Ads exposes. To find the " +
            "location_code and language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/google/historical_keyword_data/live/",
        categories: ["seo"],
    },
    endpoint: "/labs/historical-keyword-data",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/google/historical_keyword_data/live",
    },
    input: { schema: { body: zLabsHistoricalKeywordDataBody } },
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
        estimate: ({ data }) => ({
            counts: { rows: data.input.body.keywords.length },
        }),
    },
});
