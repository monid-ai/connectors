import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsRankedKeywordsBody } from "./schema/inputs.ts";

/**
 * Ranked Keywords — `POST /v3/dataforseo_labs/google/ranked_keywords/live`
 * (v1 `/labs/ranked-keywords`). Per-row: $0.012 per request plus $0.00012
 * per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Ranked Keywords",
        summary: "List keywords a domain or page ranks for in Google, with " +
            "positions.",
        description: "Keywords a target domain, subdomain, or URL ranks for. " +
            "Returns per keyword the ranked position, ranking URL, SERP " +
            "element type, estimated traffic, search volume, CPC, " +
            "difficulty, intent, and position changes. Supports " +
            "item_types, historical_serp_mode (live, lost, all), filters, " +
            "sorting, and up to 1000 rows. Suited for competitor keyword " +
            "gap analysis and rank audits. To see which fields filters " +
            "and order_by accept here, call dataforseo#labs/filters (free " +
            "lookup of filterable fields per Labs endpoint). To find the " +
            "location_code and language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live/",
        categories: ["seo"],
        notes: [
            "include_clickstream_data doubles the price of the call.",
        ],
    },
    endpoint: "/labs/ranked-keywords",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/google/ranked_keywords/live",
    },
    input: {
        schema: {
            body: zLabsRankedKeywordsBody.extend({
                limit: zLabsRankedKeywordsBody.shape.limit.unwrap().default(
                    100,
                ),
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
