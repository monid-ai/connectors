import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSerpGoogleImagesBody } from "./schema/inputs.ts";

/**
 * Google Image Results — `POST /v3/serp/google/images/live/advanced` (v1
 * `/serp/google-images`). Page-billed: $0.002 per page of 100 results; the
 * hold and the count are the results asked for, the vendor's default when
 * omitted (design D4 / D5).
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Image Results",
        summary: "Search Google Images and get ranked image results with " +
            "source pages.",
        description:
            "Google Images results for a keyword and location. Returns " +
            "images with rank, title, alt text, image URL, source page " +
            "URL and domain, and encoded thumbnail. Supports depth up to " +
            "200, language, and device. Suited for visual search audits, " +
            "image SEO, and brand imagery monitoring. To find the " +
            "location_code or exact location_name for a city or country, " +
            "call dataforseo#serp/google-locations (free lookup of Google " +
            "locations; country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/serp/google/images/live/advanced/",
        categories: ["image-search"],
        notes: [
            "Billed per page of 100 results; each further page adds the " +
            "same price.",
        ],
    },
    endpoint: "/serp/google-images",
    request: { method: "POST", path: "/v3/serp/google/images/live/advanced" },
    input: {
        schema: {
            body: zSerpGoogleImagesBody.extend({
                depth: zSerpGoogleImagesBody.shape.depth.unwrap().default(100),
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
