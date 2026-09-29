import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsHistoricalRankOverviewBody } from "./schema/inputs.ts";

/**
 * Historical Rank Overview — `POST
 * /v3/dataforseo_labs/google/historical_rank_overview/live` (v1
 * `/labs/historical-rank-overview`). Per-row: $0.12 per request plus $0.0012
 * per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Historical Rank Overview",
        summary: "Get a domain's monthly ranking summary history.",
        description:
            "Month-by-month ranking overview of a target domain: organic " +
            "and paid keyword counts, estimated traffic, and position " +
            "distribution per month. Supports date_from, date_to, and " +
            "correlate. Billed per month returned. Suited for long-term " +
            "visibility trend charts. To find the location_code and " +
            "language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/google/historical_rank_overview/live/",
        categories: ["seo"],
        notes: [
            "include_clickstream_data doubles the price of the call.",
        ],
    },
    endpoint: "/labs/historical-rank-overview",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/google/historical_rank_overview/live",
    },
    input: { schema: { body: zLabsHistoricalRankOverviewBody } },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                base_fee: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 0.12 },
                    label: "base fee",
                    description: "the per-request fee",
                },
                rows: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.0012 },
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
            return { counts: { rows: calls * 1 + (calls - 1) * 100 } };
        },
    },
});
