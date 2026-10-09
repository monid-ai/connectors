import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSerpYahooOrganicBody } from "./schema/inputs.ts";

/**
 * Yahoo Search Results — `POST /v3/serp/yahoo/organic/live/advanced` (v1
 * `/serp/yahoo-organic`). Page-billed: $0.002 per page of 10 results; the
 * hold and the count are the results asked for, the vendor's default when
 * omitted (design D4 / D5).
 */
export default defineEndpoint({
    meta: {
        displayName: "Yahoo Search Results",
        summary: "Fetch live Yahoo organic search results with SERP features " +
            "parsed.",
        description: "Live Yahoo SERP for a keyword, location, and language. " +
            "Returns organic results with rank, title, URL, description, " +
            "and sitelinks, plus people also ask, related searches, " +
            "images, videos, and paid ads. Supports depth up to 200 and " +
            "target filtering. Suited for Yahoo rank tracking and engine " +
            "comparisons. To find the location_code or exact " +
            "location_name for a city or country, call " +
            "dataforseo#serp/yahoo-locations (free lookup of Yahoo " +
            "locations; country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/serp/yahoo/organic/live/advanced/",
        categories: ["web-search"],
        notes: [
            "Billed per page of 10 results; each further page adds the " +
            "same price.",
        ],
    },
    endpoint: "/serp/yahoo-organic",
    request: { method: "POST", path: "/v3/serp/yahoo/organic/live/advanced" },
    input: {
        schema: {
            body: zSerpYahooOrganicBody.extend({
                depth: zSerpYahooOrganicBody.shape.depth.unwrap().default(10),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            every: 10,
            consumes: { credit: "default", amount: 0.002 },
            label: "results requested",
            description:
                "results asked for (depth, or max_crawl_pages pages), " +
                "billed per page of 10",
        },
        estimate: ({ data }) => ({
            counts: {
                RESULT: Math.max(
                    data.input.body.depth,
                    (data.input.body.max_crawl_pages ?? 1) * 10,
                ),
            },
        }),
    },
});
