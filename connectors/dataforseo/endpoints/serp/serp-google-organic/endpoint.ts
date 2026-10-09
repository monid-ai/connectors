import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSerpGoogleOrganicBody } from "./schema/inputs.ts";

/**
 * Google Search Results — `POST /v3/serp/google/organic/live/advanced` (v1
 * `/serp/google-organic`). Page-billed: $0.002 per page of 10 results; the
 * hold and the count are the results asked for, the vendor's default when
 * omitted (design D4 / D5).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Search Results",
        summary: "Fetch live Google organic search results with every SERP " +
            "feature parsed.",
        description:
            "Live Google SERP for a keyword, location, language, and " +
            "device. Returns organic results with rank, title, URL, " +
            "breadcrumb, description, and sitelinks, plus parsed SERP " +
            "elements: featured snippets, people also ask, AI overview, " +
            "local pack, knowledge graph, images, videos, shopping, top " +
            "stories, related searches, and paid ads. Supports depth up " +
            "to 200 results, mobile or desktop, se_domain, target " +
            "filtering (rank checks for one domain), and AI-overview " +
            "loading. Suited for rank tracking, SERP feature audits, and " +
            "competitor visibility checks. To find the location_code or " +
            "exact location_name for a city or country, call " +
            "dataforseo#serp/google-locations (free lookup of Google " +
            "locations; country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/serp/google/organic/live/advanced/",
        categories: ["web-search"],
        notes: [
            "Billed per page of 10 results; each further page adds the " +
            "same price.",
        ],
    },
    endpoint: "/serp/google-organic",
    request: { method: "POST", path: "/v3/serp/google/organic/live/advanced" },
    input: {
        schema: {
            body: zSerpGoogleOrganicBody.extend({
                depth: zSerpGoogleOrganicBody.shape.depth.unwrap().default(10),
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
        // calculate_rectangles and load_async_ai_overview are billed one
        // more page price each; people_also_ask clicks ($0.00015 each,
        // at most 4) fit inside one more page
        estimate: ({ data }) => {
            const body = data.input.body;
            const extras = [
                body.calculate_rectangles,
                body.load_async_ai_overview,
                body.people_also_ask_click_depth !== undefined,
            ].filter(Boolean).length;
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
