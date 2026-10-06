import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsTopSearchesBody } from "./schema/inputs.ts";

/**
 * Top Searches — `POST /v3/dataforseo_labs/google/top_searches/live` (v1
 * `/labs/top-searches`). Per-row: $0.012 per request plus $0.00012 per row
 * returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Top Searches",
        summary: "List the highest-volume keywords in a location and language.",
        description:
            "Top keywords by search volume for a location and language. " +
            "Returns per keyword the search volume, CPC, competition, " +
            "difficulty, intent, and SERP info. Supports filters, " +
            "sorting, and up to 1000 rows. Suited for market-level demand " +
            "mapping. To see which fields filters and order_by accept " +
            "here, call dataforseo#labs/filters (free lookup of " +
            "filterable fields per Labs endpoint). To find the " +
            "location_code and language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/google/top_searches/live/",
        categories: ["seo"],
        notes: [
            "include_clickstream_data doubles the price of the call.",
        ],
    },
    endpoint: "/labs/top-searches",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/google/top_searches/live",
    },
    input: {
        schema: {
            body: zLabsTopSearchesBody.extend({
                limit: zLabsTopSearchesBody.shape.limit.unwrap().default(100),
            }),
        },
    },
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
                    rows: calls * data.input.body.limit + (calls - 1) * 100,
                },
            };
        },
    },
});
