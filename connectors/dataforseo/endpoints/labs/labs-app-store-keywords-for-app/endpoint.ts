import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsAppStoreKeywordsForAppBody } from "./schema/inputs.ts";

/**
 * App Store App Keywords — `POST
 * /v3/dataforseo_labs/apple/keywords_for_app/live` (v1
 * `/labs/app-store-keywords-for-app`). Per-row: $0.012 per request plus
 * $0.00012 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "App Store App Keywords",
        summary: "List keywords an App Store app ranks for, with positions.",
        description:
            "Keywords an App Store app ranks for. Returns per keyword the " +
            "rank, search volume, and app snippet. Supports filters, " +
            "sorting, and up to 1000 rows. Suited for App Store " +
            "optimisation audits. To see which fields filters and " +
            "order_by accept here, call dataforseo#labs/filters (free " +
            "lookup of filterable fields per Labs endpoint). To find the " +
            "location_code and language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/apple/keywords_for_app/live/",
        categories: ["app-stores"],
    },
    endpoint: "/labs/app-store-keywords-for-app",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/apple/keywords_for_app/live",
    },
    input: {
        schema: {
            body: zLabsAppStoreKeywordsForAppBody.extend({
                limit: zLabsAppStoreKeywordsForAppBody.shape.limit.unwrap()
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
