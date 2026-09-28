import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTrendsLocationsQueryParams } from "./schema/inputs.ts";

/** GET /trends/locations: List X (Twitter) Trend Locations. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "List X (Twitter) Trend Locations",
        summary: "Every location X offers trends for, with WOEIDs.",
        description:
            "List every country and city X publishes trends for, about 470, " +
            "each with its WOEID, name, country, country code, and type. " +
            "Feed a WOEID to `getxapi#trends`.",
        docsUrl: "https://docs.getxapi.com/docs/trends/trend-locations",
        categories: ["twitter"],
        notes: [
            "The list changes rarely; cache it rather than calling it " +
            "before every trends lookup.",
        ],
    },
    request: { method: "GET", path: "/trends/locations" },
    input: { schema: { queryParams: zTrendsLocationsQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "locations",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
