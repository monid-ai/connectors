import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBusinessListingsBody } from "./schema/inputs.ts";

/**
 * Business Listings Search — `POST
 * /v3/business_data/business_listings/search/live` (v1
 * `/business/listings`). Per-row: $0.012 per request plus $0.00036 per row
 * returned (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Business Listings Search",
        summary: "Search a database of Google Maps businesses by category, " +
            "name, or area.",
        description:
            "Businesses from DataForSEO's Google Maps listings database. " +
            "Returns per business the title, category and additional " +
            "categories, address components, phone, website, rating and " +
            "votes, price level, hours, latitude/longitude, place_id and " +
            "cid, and attributes. Supports categories, title and " +
            "description search, is_claimed, location_coordinate radius, " +
            "filters, sorting, and up to 1000 rows. Suited for local lead " +
            "lists and POI datasets without live scraping. To find " +
            "business category names to search by, call " +
            "dataforseo#business/categories (free lookup, search by " +
            "name). To see which fields filters and order_by accept here, " +
            "call dataforseo#business/listing-filters (free lookup).",
        docsUrl:
            "https://docs.dataforseo.com/v3/business_data/business_listings/search/live/",
        categories: ["maps"],
    },
    endpoint: "/business/listings",
    request: {
        method: "POST",
        path: "/v3/business_data/business_listings/search/live",
    },
    input: {
        schema: {
            body: zBusinessListingsBody.extend({
                limit: zBusinessListingsBody.shape.limit.unwrap().default(100),
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
