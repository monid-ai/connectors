import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGooglePlayListingsBody } from "./schema/inputs.ts";

/**
 * Google Play App Database — `POST
 * /v3/app_data/google/app_listings/search/live` (v1
 * `/google-play/listings`). Per-row: $0.1 per request plus $0.001 per row
 * returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Play App Database",
        summary:
            "Search a database of Google Play apps by title, category, or " +
            "rating.",
        description: "Google Play apps from DataForSEO's listings database. " +
            "Returns per app the id, title, developer, category, rating " +
            "and votes, installs, price, and last update. Supports title " +
            "and description search, categories, filters, sorting, and up " +
            "to 1000 rows. Suited for building app lists without scraping " +
            "the store. To find category names for the listings search, " +
            "call dataforseo#google-play/listing-categories (free " +
            "lookup).",
        docsUrl:
            "https://docs.dataforseo.com/v3/app_data/google/app_listings/search/live/",
        categories: ["app-stores"],
    },
    endpoint: "/google-play/listings",
    request: {
        method: "POST",
        path: "/v3/app_data/google/app_listings/search/live",
    },
    input: {
        schema: {
            body: zGooglePlayListingsBody.extend({
                limit: zGooglePlayListingsBody.shape.limit.unwrap().default(
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
