import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSerpBingOrganicBody } from "./schema/inputs.ts";

/**
 * Bing Search Results — `POST /v3/serp/bing/organic/live/advanced` (v1
 * `/serp/bing-organic`). Page-billed: $0.002 per page of 10 results; the
 * hold and the count are the results asked for, the vendor's default when
 * omitted (design D4 / D5).
 */
export default defineEndpoint({
    meta: {
        displayName: "Bing Search Results",
        summary: "Fetch live Bing organic search results with SERP features " +
            "parsed.",
        description: "Live Bing SERP for a keyword, location, language, and " +
            "device. Returns organic results with rank, title, URL, " +
            "description, and sitelinks, plus people also ask, related " +
            "searches, images, videos, news, and paid ads. Supports depth " +
            "up to 200 and target filtering. Suited for Bing rank " +
            "tracking and cross-engine visibility comparisons. To find " +
            "the location_code or exact location_name for a city or " +
            "country, call dataforseo#serp/bing-locations (free lookup of " +
            "Bing locations; country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/serp/bing/organic/live/advanced/",
        categories: ["web-search"],
        notes: [
            "Billed per page of 10 results; each further page adds the " +
            "same price.",
        ],
    },
    endpoint: "/serp/bing-organic",
    request: { method: "POST", path: "/v3/serp/bing/organic/live/advanced" },
    input: {
        schema: {
            body: zSerpBingOrganicBody.extend({
                depth: zSerpBingOrganicBody.shape.depth.unwrap().default(10),
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
        // calculate_rectangles is billed one more page price
        estimate: ({ data }) => {
            const body = data.input.body;
            const extras = body.calculate_rectangles ? 1 : 0;
            return {
                counts: {
                    RESULT:
                        Math.max(body.depth, (body.max_crawl_pages ?? 1) * 10) +
                        extras * 10,
                },
            };
        },
    },
});
