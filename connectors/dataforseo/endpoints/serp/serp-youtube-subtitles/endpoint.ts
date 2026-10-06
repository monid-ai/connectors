import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSerpYoutubeSubtitlesBody } from "./schema/inputs.ts";

/**
 * YouTube Subtitles — `POST /v3/serp/youtube/video_subtitles/live/advanced`
 * (v1 `/serp/youtube-subtitles`). Flat: $0.002 per call (design D4).
 */
export default defineEndpoint({
    meta: {
        displayName: "YouTube Subtitles",
        summary: "Fetch the subtitle track of a YouTube video with timestamps.",
        description: "Subtitles of a YouTube video by video_id and language. " +
            "Returns the caption segments with start time, duration, and " +
            "text, plus the subtitle language and whether it is " +
            "auto-generated. Suited for transcript extraction, " +
            "summarisation, and quote finding. To find the location_code " +
            "or exact location_name for a city or country, call " +
            "dataforseo#serp/youtube-locations (free lookup of YouTube " +
            "locations).",
        docsUrl:
            "https://docs.dataforseo.com/v3/serp/youtube/video_subtitles/live/advanced/",
        categories: ["youtube"],
    },
    endpoint: "/serp/youtube-subtitles",
    request: {
        method: "POST",
        path: "/v3/serp/youtube/video_subtitles/live/advanced",
    },
    input: { schema: { body: zSerpYoutubeSubtitlesBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 0.002 },
        },
    },
});
