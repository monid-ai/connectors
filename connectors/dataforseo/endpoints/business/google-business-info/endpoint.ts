import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zGoogleBusinessInfoBody } from "./schema/inputs.ts";

/**
 * Google Business Profile — `POST
 * /v3/business_data/google/my_business_info/live` (v1
 * `/google-business/info`). Flat: $0.0054 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Business Profile",
        summary: "Fetch a Google Business Profile: contacts, hours, rating, " +
            "attributes.",
        description:
            "Google Business Profile of a business found by name and " +
            "location. Returns title, category and additional categories, " +
            "address, phone, website, rating and votes, hours and popular " +
            "times, price level, attributes, description, photos, " +
            "place_id and cid, and people-also-search. Suited for local " +
            "listing audits and lead enrichment. To find the " +
            "location_code or exact location_name for a city or country, " +
            "call dataforseo#google-business/locations (free lookup, " +
            "country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/business_data/google/my_business_info/live/",
        categories: ["maps"],
    },
    endpoint: "/google-business/info",
    request: {
        method: "POST",
        path: "/v3/business_data/google/my_business_info/live",
    },
    input: { schema: { body: zGoogleBusinessInfoBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.0054 },
        },
    },
});
