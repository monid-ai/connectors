import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSerpGoogleNewsBody } from "./schema/inputs.ts";

/**
 * Google News Results — `POST /v3/serp/google/news/live/advanced` (v1
 * `/serp/google-news`). Page-billed: $0.002 per page of 100 results; the
 * hold and the count are the results asked for, the vendor's default when
 * omitted (design D4 / D5).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google News Results",
        summary: "Search Google News and get articles with source, time, and " +
            "snippet.",
        description:
            "Google News results for a keyword and location. Returns news " +
            "articles with rank, title, URL, domain, source name, " +
            "snippet, publish time, and thumbnail, plus top-stories " +
            "carousels. Supports depth up to 200, language, and device. " +
            "Suited for news monitoring, PR coverage checks, and topic " +
            "research. To find the location_code or exact location_name " +
            "for a city or country, call dataforseo#serp/google-locations " +
            "(free lookup of Google locations; country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/serp/google/news/live/advanced/",
        categories: ["news-search"],
        notes: [
            "Billed per page of 100 results; each further page adds the " +
            "same price.",
        ],
    },
    endpoint: "/serp/google-news",
    request: { method: "POST", path: "/v3/serp/google/news/live/advanced" },
    input: {
        schema: {
            body: zSerpGoogleNewsBody.extend({
                depth: zSerpGoogleNewsBody.shape.depth.unwrap().default(100),
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
        // calculate_rectangles multiplies the task charge by 2 — whole
        // pages doubled, not one more page
        estimate: ({ data }) => {
            const body = data.input.body;
            const pages = Math.ceil(
                Math.max(body.depth, (body.max_crawl_pages ?? 1) * 100) / 100,
            );
            const times = body.calculate_rectangles ? 2 : 1;
            return { counts: { RESULT: pages * times * 100 } };
        },
    },
});
