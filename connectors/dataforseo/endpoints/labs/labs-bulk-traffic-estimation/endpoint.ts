import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsBulkTrafficEstimationBody } from "./schema/inputs.ts";

/**
 * Bulk Traffic Estimation — `POST
 * /v3/dataforseo_labs/google/bulk_traffic_estimation/live` (v1
 * `/labs/bulk-traffic-estimation`). Per-row: $0.012 per request plus
 * $0.00012 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Bulk Traffic Estimation",
        summary: "Estimate organic and paid search traffic for up to 1000 " +
            "domains.",
        description:
            "Estimated Google traffic for a list of domains, subdomains, " +
            "or pages. Returns per target the organic and paid estimated " +
            "traffic and its dollar value. Supports item_types and " +
            "location. Suited for sizing a list of sites at once. To find " +
            "the location_code and language_code pairs Labs supports, " +
            "call dataforseo#labs/locations (free lookup, search by " +
            "country name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/google/bulk_traffic_estimation/live/",
        categories: ["seo"],
    },
    endpoint: "/labs/bulk-traffic-estimation",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/google/bulk_traffic_estimation/live",
    },
    input: { schema: { body: zLabsBulkTrafficEstimationBody } },
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
            counts: { rows: data.input.body.targets.length },
        }),
    },
});
