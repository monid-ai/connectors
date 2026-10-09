import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSerpGoogleMapsBody } from "./schema/inputs.ts";

/**
 * Google Maps Results — `POST /v3/serp/google/maps/live/advanced` (v1
 * `/serp/google-maps`). Page-billed: $0.002 per page of 100 results; the
 * hold and the count are the results asked for, the vendor's default when
 * omitted (design D4 / D5).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Maps Results",
        summary: "Search Google Maps and get ranked business listings with " +
            "ratings and contacts.",
        description:
            "Google Maps results for a keyword around a location or GPS " +
            "coordinate. Returns per listing the rank, title, category, " +
            "address, phone, website, rating value and votes, price " +
            "level, hours, place_id and cid, latitude/longitude, and " +
            "photos. Supports depth up to 700, coordinate targeting, and " +
            "language. Suited for local SEO audits, lead lists of local " +
            "businesses, and map-pack rank tracking. To find the " +
            "location_code or exact location_name for a city or country, " +
            "call dataforseo#serp/google-locations (free lookup of Google " +
            "locations; country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/serp/google/maps/live/advanced/",
        categories: ["maps"],
        notes: [
            "Billed per page of 100 results; each further page adds the " +
            "same price.",
        ],
    },
    endpoint: "/serp/google-maps",
    request: { method: "POST", path: "/v3/serp/google/maps/live/advanced" },
    input: {
        schema: {
            body: zSerpGoogleMapsBody.extend({
                depth: zSerpGoogleMapsBody.shape.depth.unwrap().default(100),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            every: 100,
            consumes: { credit: "default", amount: 0.002 },
            label: "results requested",
            description:
                "results asked for (depth, or max_crawl_pages pages), " +
                "billed per page of 100",
        },
        estimate: ({ data }) => ({
            counts: {
                RESULT: Math.max(
                    data.input.body.depth,
                    (data.input.body.max_crawl_pages ?? 1) * 100,
                ),
            },
        }),
    },
});
