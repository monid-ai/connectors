import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsAppStoreAppCompetitorsBody } from "./schema/inputs.ts";

/**
 * App Store App Competitors — `POST
 * /v3/dataforseo_labs/apple/app_competitors/live` (v1
 * `/labs/app-store-app-competitors`). Per-row: $0.012 per request plus
 * $0.00012 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "App Store App Competitors",
        summary: "Find App Store apps competing on shared keywords.",
        description:
            "Competitor apps of an App Store app. Returns per competitor " +
            "the app id, shared keyword count, average position, and " +
            "visibility. Supports filters, sorting, and up to 1000 rows. " +
            "Suited for app competitor discovery. To see which fields " +
            "filters and order_by accept here, call " +
            "dataforseo#labs/filters (free lookup of filterable fields " +
            "per Labs endpoint). To find the location_code and " +
            "language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/apple/app_competitors/live/",
        categories: ["app-stores"],
    },
    endpoint: "/labs/app-store-app-competitors",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/apple/app_competitors/live",
    },
    input: {
        schema: {
            body: zLabsAppStoreAppCompetitorsBody.extend({
                limit: zLabsAppStoreAppCompetitorsBody.shape.limit.unwrap()
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
