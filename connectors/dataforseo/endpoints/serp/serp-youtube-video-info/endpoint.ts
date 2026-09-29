import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSerpYoutubeVideoInfoBody } from "./schema/inputs.ts";

/**
 * YouTube Video Details — `POST /v3/serp/youtube/video_info/live/advanced`
 * (v1 `/serp/youtube-video-info`). Flat: $0.002 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "YouTube Video Details",
        summary: "Fetch metadata and stats for one YouTube video by id.",
        description: "Details of a YouTube video by video_id. Returns title, " +
            "description, channel name and id, publish date, views, " +
            "likes, comments count, duration, category, keywords, " +
            "thumbnail, and whether it is live or a short, plus related " +
            "videos. Suited for video audits and creator research. To " +
            "find the location_code or exact location_name for a city or " +
            "country, call dataforseo#serp/youtube-locations (free lookup " +
            "of YouTube locations).",
        docsUrl:
            "https://docs.dataforseo.com/v3/serp/youtube/video_info/live/advanced/",
        categories: ["youtube", "video-search"],
    },
    endpoint: "/serp/youtube-video-info",
    request: {
        method: "POST",
        path: "/v3/serp/youtube/video_info/live/advanced",
    },
    input: { schema: { body: zSerpYoutubeVideoInfoBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.002 },
        },
    },
});
