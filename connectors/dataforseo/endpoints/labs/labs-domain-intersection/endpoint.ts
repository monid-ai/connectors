import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsDomainIntersectionBody } from "./schema/inputs.ts";

/**
 * Domain Keyword Intersection — `POST
 * /v3/dataforseo_labs/google/domain_intersection/live` (v1
 * `/labs/domain-intersection`). Per-row: $0.012 per request plus $0.00012
 * per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Domain Keyword Intersection",
        summary:
            "List keywords two domains both rank for, with each domain's " +
            "position.",
        description:
            "Keywords target1 and target2 both rank for. Returns per " +
            "keyword both domains' positions, ranking URLs, and traffic, " +
            "plus search volume, CPC, difficulty, and intent. Supports " +
            "intersections toggle (exclusive to target1), filters, " +
            "sorting, and up to 1000 rows. Suited for keyword gap " +
            "analysis. To see which fields filters and order_by accept " +
            "here, call dataforseo#labs/filters (free lookup of " +
            "filterable fields per Labs endpoint). To find the " +
            "location_code and language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/google/domain_intersection/live/",
        categories: ["seo"],
        notes: [
            "include_clickstream_data doubles the price of the call.",
        ],
    },
    endpoint: "/labs/domain-intersection",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/google/domain_intersection/live",
    },
    input: {
        schema: {
            body: zLabsDomainIntersectionBody.extend({
                limit: zLabsDomainIntersectionBody.shape.limit.unwrap().default(
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
