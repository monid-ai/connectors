import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAppStoreListingsBody } from "./schema/inputs.ts";

/**
 * App Store App Database — `POST
 * /v3/app_data/apple/app_listings/search/live` (v1 `/app-store/listings`).
 * Per-row: $0.1 per request plus $0.001 per row returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "App Store App Database",
        summary: "Search a database of App Store apps by title, category, or " +
            "rating.",
        description:
            "App Store apps from DataForSEO's listings database. Returns " +
            "per app the id, title, developer, category, rating and " +
            "votes, price, and last update. Supports title and " +
            "description search, categories, filters, sorting, and up to " +
            "1000 rows. Suited for building app lists without scraping " +
            "the store. To find category names for the listings search, " +
            "call dataforseo#app-store/listing-categories (free lookup).",
        docsUrl:
            "https://docs.dataforseo.com/v3/app_data/apple/app_listings/search/live/",
        categories: ["app-stores"],
    },
    endpoint: "/app-store/listings",
    request: {
        method: "POST",
        path: "/v3/app_data/apple/app_listings/search/live",
    },
    input: {
        schema: {
            body: zAppStoreListingsBody.extend({
                limit: zAppStoreListingsBody.shape.limit.unwrap().default(100),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                base_fee: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 0.1 },
                    label: "base fee",
                    description: "the per-request fee",
                },
                rows: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.001 },
                    label: "rows",
                    description: "items returned (result[0].items, or its " +
                        "items_count when the items were not returned)",
                },
            },
        },
        estimate: ({ data }) => ({ counts: { rows: data.input.body.limit } }),
    },
});
