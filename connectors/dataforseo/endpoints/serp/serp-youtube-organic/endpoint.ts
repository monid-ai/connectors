import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSerpYoutubeOrganicBody } from "./schema/inputs.ts";

/**
 * YouTube Search Results — `POST /v3/serp/youtube/organic/live/advanced` (v1
 * `/serp/youtube-organic`). Page-billed: $0.002 per page of 20 results; the
 * hold and the count are the results asked for (the vendor's knob here is
 * `block_depth`, not `depth`), the vendor's default when omitted (design D4 /
 * D5).
 */
export default defineEndpoint({
    meta: {
        displayName: "YouTube Search Results",
        summary: "Search YouTube and get ranked videos with channel, views, " +
            "and duration.",
        description:
            "YouTube search results for a keyword and location. Returns " +
            "videos with rank, video_id, title, URL, channel name and id, " +
            "publish date, views, duration, thumbnail, and badges such as " +
            "live or verified, plus shorts and channel blocks. Supports " +
            "block_depth (20 per page) and device. Suited for video SEO, " +
            "channel research, and topic monitoring. To find " +
            "the location_code or exact location_name for a city or " +
            "country, call dataforseo#serp/youtube-locations (free lookup " +
            "of YouTube locations; country filter + search).",
        docsUrl:
            "https://docs.dataforseo.com/v3/serp/youtube/organic/live/advanced/",
        categories: ["video-search", "youtube"],
        notes: [
            "Billed per page of 20 results; each further page adds the " +
            "same price.",
        ],
    },
    endpoint: "/serp/youtube-organic",
    request: { method: "POST", path: "/v3/serp/youtube/organic/live/advanced" },
    input: {
        schema: {
            body: zSerpYoutubeOrganicBody.extend({
                block_depth: zSerpYoutubeOrganicBody.shape.block_depth.unwrap()
                    .default(20),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            every: 20,
            consumes: { credit: "default", amount: 0.002 },
            label: "results requested",
            description:
                "results asked for (block_depth), billed per page of 20",
        },
        estimate: ({ data }) => ({
            counts: { RESULT: data.input.body.block_depth },
        }),
    },
});
