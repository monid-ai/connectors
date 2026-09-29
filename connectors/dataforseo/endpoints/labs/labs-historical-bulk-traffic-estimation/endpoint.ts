import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsHistoricalBulkTrafficEstimationBody } from "./schema/inputs.ts";

/**
 * Historical Traffic Estimation — `POST
 * /v3/dataforseo_labs/google/historical_bulk_traffic_estimation/live` (v1
 * `/labs/historical-bulk-traffic-estimation`). Per-row: $0.12 per request
 * plus $0.0012 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Historical Traffic Estimation",
        summary: "Get monthly traffic estimates for up to 1000 domains.",
        description: "Month-by-month estimated Google traffic for a list of " +
            "domains. Returns per target and month the organic and paid " +
            "traffic estimates. Supports date_from and date_to. Billed " +
            "per domain-month. Suited for traffic trend comparisons " +
            "across a portfolio. To find the location_code and " +
            "language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/google/historical_bulk_traffic_estimation/live/",
        categories: ["seo"],
    },
    endpoint: "/labs/historical-bulk-traffic-estimation",
    request: {
        method: "POST",
        path:
            "/v3/dataforseo_labs/google/historical_bulk_traffic_estimation/live",
    },
    input: { schema: { body: zLabsHistoricalBulkTrafficEstimationBody } },
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
        estimate: ({ data }) => ({
            counts: { rows: data.input.body.targets.length },
        }),
    },
});
