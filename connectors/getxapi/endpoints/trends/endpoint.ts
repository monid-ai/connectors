import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTrendsQueryParams } from "./schema/inputs.ts";

/** GET /trends: Get X (Twitter) Trends. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Get X (Twitter) Trends",
        summary: "Live trending topics for a country or city.",
        description:
            "Get the current X trends for a location, ranked, up to 50, " +
            "each with a ready-made search `query` and `search_url` and a " +
            "flag for promoted trends. Pass a country or city name or ISO " +
            "country code in `country`, or a WOEID in `woeid`; with " +
            "neither, trends are worldwide. `getxapi#trends/locations` " +
            "lists every supported location and its WOEID.",
        docsUrl: "https://docs.getxapi.com/docs/trends/get-trends",
        categories: ["twitter"],
        notes: [
            "When both `country` and `woeid` are given, `woeid` wins.",
        ],
    },
    request: { method: "GET", path: "/trends" },
    input: { schema: { queryParams: zTrendsQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "trends",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
