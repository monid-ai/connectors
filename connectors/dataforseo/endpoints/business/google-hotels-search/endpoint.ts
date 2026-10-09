import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleHotelsSearchBody } from "./schema/inputs.ts";

/**
 * Google Hotels Search — `POST /v3/business_data/google/hotel_searches/live`
 * (v1 `/google-hotels/search`). Page-billed: $0.004 per page of 18 results;
 * the hold and the count are the results asked for, the vendor's default
 * when omitted (design D4 / D5).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Hotels Search",
        summary: "Search Google Hotels for a stay and get hotels with prices " +
            "and ratings.",
        description:
            "Google Hotels results for a keyword or location, check-in " +
            "and check-out dates, and guests. Returns hotels with rank, " +
            "hotel_identifier, title, price and currency, rating and " +
            "reviews, star class, amenities, and images. Supports depth, " +
            "sort_by, price range, and currency. Suited for rate shopping " +
            "and travel research. To find the location_code or exact " +
            "location_name for a city or country, call " +
            "dataforseo#google-business/locations (free lookup, country " +
            "filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/business_data/google/hotel_searches/live/",
        categories: ["hotels"],
        notes: [
            "Billed per page of 18 organic hotels.",
        ],
    },
    endpoint: "/google-hotels/search",
    request: {
        method: "POST",
        path: "/v3/business_data/google/hotel_searches/live",
    },
    input: {
        schema: {
            body: zGoogleHotelsSearchBody.extend({
                depth: zGoogleHotelsSearchBody.shape.depth.unwrap().default(18),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            every: 18,
            consumes: { credit: "default", amount: 0.004 },
            label: "results requested",
            description: "results asked for (depth), billed per page of 18",
        },
        estimate: ({ data }) => ({ counts: { RESULT: data.input.body.depth } }),
    },
});
