import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsSerpCompetitorsBody } from "./schema/inputs.ts";

/**
 * SERP Competitors — `POST /v3/dataforseo_labs/google/serp_competitors/live`
 * (v1 `/labs/serp-competitors`). Per-row: $0.012 per request plus $0.00012
 * per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "SERP Competitors",
        summary: "Find domains competing across a set of keywords in Google " +
            "SERPs.",
        description:
            "Domains ranking for a keyword set (up to 200). Returns per " +
            "domain the average position, rating, visibility, number of " +
            "keywords in the set it ranks for, and median position. " +
            "Supports filters, sorting, and up to 1000 rows. Suited for " +
            "identifying who to benchmark against. To see which fields " +
            "filters and order_by accept here, call " +
            "dataforseo#labs/filters (free lookup of filterable fields " +
            "per Labs endpoint). To find the location_code and " +
            "language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/google/serp_competitors/live/",
        categories: ["seo"],
    },
    endpoint: "/labs/serp-competitors",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/google/serp_competitors/live",
    },
    input: {
        schema: {
            body: zLabsSerpCompetitorsBody.extend({
                limit: zLabsSerpCompetitorsBody.shape.limit.unwrap().default(
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
        estimate: ({ data }) => ({ counts: { rows: data.input.body.limit } }),
    },
});
