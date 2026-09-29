import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLabsCategoriesForDomainBody } from "./schema/inputs.ts";

/**
 * Categories for Domain — `POST
 * /v3/dataforseo_labs/google/categories_for_domain/live` (v1
 * `/labs/categories-for-domain`). Per-row: $0.012 per request plus $0.00012
 * per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Categories for Domain",
        summary: "List product categories a domain ranks for, with traffic " +
            "estimates.",
        description:
            "Categories a target domain ranks in, from the Google keyword " +
            "database. Returns per category the code, name, ranked " +
            "keyword count, estimated traffic, and rank distribution. " +
            "Supports filters, sorting, and up to 1000 rows. Suited for " +
            "understanding a competitor's topical footprint. To see which " +
            "fields filters and order_by accept here, call " +
            "dataforseo#labs/filters (free lookup of filterable fields " +
            "per Labs endpoint). To find the location_code and " +
            "language_code pairs Labs supports, call " +
            "dataforseo#labs/locations (free lookup, search by country " +
            "name). To look up the names behind the returned category " +
            "codes, call dataforseo#labs/categories (free lookup, search " +
            "by name).",
        docsUrl:
            "https://docs.dataforseo.com/v3/dataforseo_labs/google/categories_for_domain/live/",
        categories: ["seo"],
        notes: [
            "include_clickstream_data doubles the price of the call.",
        ],
    },
    endpoint: "/labs/categories-for-domain",
    request: {
        method: "POST",
        path: "/v3/dataforseo_labs/google/categories_for_domain/live",
    },
    input: {
        schema: {
            body: zLabsCategoriesForDomainBody.extend({
                limit: zLabsCategoriesForDomainBody.shape.limit.unwrap()
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
