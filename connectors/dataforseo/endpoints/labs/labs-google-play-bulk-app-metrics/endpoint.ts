import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsGooglePlayBulkAppMetricsBody } from "./schema/inputs.ts";

/**
 * Google Play App Metrics — `POST
 * /v3/dataforseo_labs/google/bulk_app_metrics/live` (v1
 * `/labs/google-play-bulk-app-metrics`). Per-row: $0.012 per request plus
 * $0.00012 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Play App Metrics",
        summary: "Get ranking metrics for up to 1000 Google Play apps.",
        description:
            "Rank metrics for a list of Google Play app_ids: per app the " +
            "count of keywords it ranks for and the position distribution " +
            "in Play search. Suited for app portfolio visibility checks. " +
            "To find the location_code and language_code pairs Labs " +
            "supports, call dataforseo#labs/locations (free lookup, " +
            "search by country name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/google/bulk_app_metrics/live/",
        categories: ["app-stores"],
    },
    endpoint: "/labs/google-play-bulk-app-metrics",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/google/bulk_app_metrics/live",
    },
    input: { schema: { body: zLabsGooglePlayBulkAppMetricsBody } },
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
            counts: { rows: data.input.body.app_ids.length },
        }),
    },
});
