import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSerpYoutubeCommentsBody } from "./schema/inputs.ts";

/**
 * YouTube Comments — `POST /v3/serp/youtube/video_comments/live/advanced`
 * (v1 `/serp/youtube-comments`). Page-billed: $0.002 per page of 20 results;
 * the hold and the count are the results asked for, the vendor's default
 * when omitted (design D4 / D5).
 */
export default defineEndpoint({
    meta: {
        displayName: "YouTube Comments",
        summary:
            "Fetch top comments on a YouTube video with authors and like " +
            "counts.",
        description:
            "Comments of a YouTube video by video_id. Returns comments " +
            "with author name and channel, text, publish time, likes, " +
            "reply count, and pinned or hearted flags. Supports depth (20 " +
            "per page). Suited for audience sentiment, reply mining, and " +
            "moderation checks. To find the location_code or exact " +
            "location_name for a city or country, call " +
            "dataforseo#serp/youtube-locations (free lookup of YouTube " +
            "locations).",
        docsUrl:
            "https://docs.dataforseo.com/v3/serp/youtube/video_comments/live/advanced/",
        categories: ["youtube"],
        notes: [
            "Billed per page of 20 results; each further page adds the " +
            "same price.",
        ],
    },
    endpoint: "/serp/youtube-comments",
    request: {
        method: "POST",
        path: "/v3/serp/youtube/video_comments/live/advanced",
    },
    input: {
        schema: {
            body: zSerpYoutubeCommentsBody.extend({
                depth: zSerpYoutubeCommentsBody.shape.depth.unwrap().default(
                    20,
                ),
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
            description: "results asked for (depth), billed per page of 20",
        },
        estimate: ({ data }) => ({ counts: { RESULT: data.input.body.depth } }),
    },
});
