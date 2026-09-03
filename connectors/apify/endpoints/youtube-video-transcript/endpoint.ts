import { defineEndpoint } from "@shared/core";
import { zYoutubeVideoTranscriptBody } from "./schema/inputs.ts";

/**
 * starvibe/youtube-video-transcript — Get YouTube Transcript. Pure data;
 * the async machinery is inherited leaf-wise from the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get YouTube Transcript",
        summary:
            "Extract a full timestamped transcript plus video metadata from a YouTube video URL.",
        description:
            "Extracts full transcripts with timestamps and video metadata " +
            "from YouTube videos by URL. Returns transcript text with " +
            "timing data, video title, description, upload date, view and " +
            "like counts, channel information, and duration. Also supports " +
            "channel URLs with date filters and a `max_videos` cap. Suited " +
            "for summarization, semantic search, and NLP pipelines that " +
            "need transcript-first data keyed by video URL. Runs " +
            "asynchronously.",
        docsUrl: "https://apify.com/starvibe/youtube-video-transcript",
        categories: ["youtube"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/starvibe~youtube-video-transcript/runs",
    },
    input: { schema: { body: zYoutubeVideoTranscriptBody } },
});
