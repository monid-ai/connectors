import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zGoogleHotelsInfoBody } from "./schema/inputs.ts";

/**
 * Google Hotel Details — `POST
 * /v3/business_data/google/hotel_info/live/advanced` (v1
 * `/google-hotels/info`). Flat: $0.004 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Hotel Details",
        summary: "Fetch a Google Hotels page: rates by provider, amenities, " +
            "reviews.",
        description: "Google Hotels details for a hotel_identifier (from " +
            "google-hotels-search). Returns the hotel's title, address, " +
            "rating and review breakdown, star class, amenities, photos, " +
            "description, and the rate list per booking provider for the " +
            "dates given; load_prices_by_dates adds a per-night price " +
            "calendar. Suited for rate comparison and hotel profiling. To " +
            "find the location_code or exact location_name for a city or " +
            "country, call dataforseo#google-business/locations (free " +
            "lookup, country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/business_data/google/hotel_info/live/advanced/",
        categories: ["hotels"],
        notes: [
            "load_prices_by_dates doubles the price of the call.",
        ],
    },
    endpoint: "/google-hotels/info",
    request: {
        method: "POST",
        path: "/v3/business_data/google/hotel_info/live/advanced",
    },
    input: { schema: { body: zGoogleHotelsInfoBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.004 },
        },
    },
});
