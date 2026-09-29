import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsGooglePlayAppIntersectionBody } from "./schema/inputs.ts";

/**
 * Google Play Keyword Intersection — `POST
 * /v3/dataforseo_labs/google/app_intersection/live` (v1
 * `/labs/google-play-app-intersection`). Per-row: $0.012 per request plus
 * $0.00012 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Play Keyword Intersection",
        summary: "List keywords several Google Play apps rank for together.",
        description:
            "Keywords shared across up to 20 Google Play apps. Returns " +
            "per keyword each app's rank and the search volume. Supports " +
            "filters, sorting, and up to 1000 rows. " +
            "Suited for ASO keyword gap analysis. To see which fields " +
            "filters and order_by accept here, call " +
            "dataforseo#labs/filters (free lookup of filterable fields " +
            "per Labs endpoint). To find the location_code and " +
            "language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/google/app_intersection/live/",
        categories: ["app-stores"],
    },
    endpoint: "/labs/google-play-app-intersection",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/google/app_intersection/live",
    },
    input: {
        schema: {
            body: zLabsGooglePlayAppIntersectionBody.extend({
                limit: zLabsGooglePlayAppIntersectionBody.shape.limit.unwrap()
                    .default(100),
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
        estimate: ({ data }) => ({ counts: { rows: data.input.body.limit } }),
    },
});
