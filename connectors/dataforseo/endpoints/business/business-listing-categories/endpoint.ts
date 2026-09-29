import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBusinessListingCategoriesBody } from "./schema/inputs.ts";

/**
 * Business Category Counts — `POST
 * /v3/business_data/business_listings/categories_aggregation/live` (v1
 * `/business/listing-categories`). Per-row: $0.012 per request plus $0.00036
 * per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Business Category Counts",
        summary: "Count businesses per category in an area or matching a " +
            "search.",
        description:
            "Category aggregation over DataForSEO's Google Maps listings " +
            "database. Returns per category the name and number of " +
            "businesses matching the search (title, description, " +
            "categories, coordinate radius). Supports " +
            "initial_dataset_filters and up to 1000 rows. Suited for " +
            "market sizing by business type. To find business category " +
            "names, call dataforseo#business/categories (free lookup, " +
            "search by name). To see which fields initial_dataset_filters " +
            "accepts here, call dataforseo#business/listing-filters (free " +
            "lookup of filterable fields).",
        docsUrl:
            "https://docs.dataforseo.com/v3/business_data/business_listings/categories_aggregation/live/",
        categories: ["maps"],
    },
    endpoint: "/business/listing-categories",
    request: {
        method: "POST",
        path: "/v3/business_data/business_listings/categories_aggregation/live",
    },
    input: {
        schema: {
            body: zBusinessListingCategoriesBody.extend({
                limit: zBusinessListingCategoriesBody.shape.limit.unwrap()
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
                    consumes: { credit: "default", amount: 0.00036 },
                    label: "rows",
                    description: "items returned (result[0].items, or its " +
                        "items_count when the items were not returned)",
                },
            },
        },
        estimate: ({ data }) => ({ counts: { rows: data.input.body.limit } }),
    },
});
