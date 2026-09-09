import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
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
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/starvibe/youtube-video-transcript",
    request: {
        method: "POST",
        path: "/v2/acts/starvibe~youtube-video-transcript/runs",
    },
    input: { schema: { body: zYoutubeVideoTranscriptBody } },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** MODE-aware (PR #2 finding): youtube_url mode returns exactly 1;
         *  channel mode caps at max_videos, whose schema default (10) is
         *  the actor's OWN server default — materialized into the body
         *  before any hook runs, so the estimate is exact. */
        estimate: ({ data, utils }) => {
            const body = data.input.body ?? null;
            const channel = utils.json.optionalGet(body, "$.channel_url");
            const amount = typeof channel === "string" && channel !== ""
                ? utils.json.optionalNum(body, "$.max_videos") ?? 10
                : 1;
            return { counts: { "RESULT": amount } };
        },
    },
});
