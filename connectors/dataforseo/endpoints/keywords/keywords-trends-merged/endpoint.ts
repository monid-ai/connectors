import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zKeywordsTrendsMergedBody } from "./schema/inputs.ts";

/**
 * Keyword Trend Overview — `POST
 * /v3/keywords_data/dataforseo_trends/merged_data/live` (v1
 * `/keywords/trends-merged`). Flat: $0.006 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "Keyword Trend Overview",
        summary: "Get trend series, subregion, and demographic data for " +
            "keywords in one call.",
        description:
            "DataForSEO Trends merged data for up to 5 keywords: the " +
            "interest-over-time graph, subregion interests, and " +
            "demographic split in one response. Supports type (web, news, " +
            "ecommerce), location, and date ranges. Suited for a full " +
            "trend profile in a single request. To find the location_code " +
            "or exact location_name for a city or country, call " +
            "dataforseo#keywords/trends-locations (free lookup of trend " +
            "locations).",
        docsUrl:
            "https://docs.dataforseo.com/v3/keywords_data/dataforseo_trends/merged_data/live/",
        categories: ["seo"],
    },
    endpoint: "/keywords/trends-merged",
    request: {
        method: "POST",
        path: "/v3/keywords_data/dataforseo_trends/merged_data/live",
    },
    input: { schema: { body: zKeywordsTrendsMergedBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.006 },
        },
    },
});
