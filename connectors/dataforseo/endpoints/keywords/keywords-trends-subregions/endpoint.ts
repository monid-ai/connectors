import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zKeywordsTrendsSubregionsBody } from "./schema/inputs.ts";

/**
 * Keyword Trend by Region — `POST
 * /v3/keywords_data/dataforseo_trends/subregion_interests/live` (v1
 * `/keywords/trends-subregions`). Flat: $0.0024 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Keyword Trend by Region",
        summary:
            "Get keyword interest split by subregion from an independent " +
            "trends dataset.",
        description:
            "DataForSEO Trends subregion interest for up to 5 keywords. " +
            "Returns interest values per state, province, or region " +
            "within the chosen location, comparable across the keywords. " +
            "Supports type (web, news, ecommerce) and date ranges. Suited " +
            "for regional demand mapping. To find the location_code for a " +
            "country or region, call dataforseo#keywords/trends-locations " +
            "(free lookup, country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/keywords_data/dataforseo_trends/subregion_interests/live/",
        categories: ["seo"],
    },
    endpoint: "/keywords/trends-subregions",
    request: {
        method: "POST",
        path: "/v3/keywords_data/dataforseo_trends/subregion_interests/live",
    },
    input: { schema: { body: zKeywordsTrendsSubregionsBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.0024 },
        },
    },
});
