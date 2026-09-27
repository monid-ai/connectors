import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zKeywordsTrendsDemographyBody } from "./schema/inputs.ts";

/**
 * Keyword Trend by Demographic — `POST
 * /v3/keywords_data/dataforseo_trends/demography/live` (v1
 * `/keywords/trends-demography`). Flat: $0.0024 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Keyword Trend by Demographic",
        summary: "Get keyword interest split by age and gender from an " +
            "independent trends dataset.",
        description:
            "DataForSEO Trends demography for up to 5 keywords. Returns " +
            "interest distribution by age group and gender for the " +
            "location and time range. Supports type (web, news, " +
            "ecommerce). Suited for audience profiling of search demand. " +
            "To find the location_code or exact location_name for a city " +
            "or country, call dataforseo#keywords/trends-locations (free " +
            "lookup of trend locations).",
        docsUrl:
            "https://docs.dataforseo.com/v3/keywords_data/dataforseo_trends/demography/live/",
        categories: ["seo"],
    },
    endpoint: "/keywords/trends-demography",
    request: {
        method: "POST",
        path: "/v3/keywords_data/dataforseo_trends/demography/live",
    },
    input: { schema: { body: zKeywordsTrendsDemographyBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.0024 },
        },
    },
});
