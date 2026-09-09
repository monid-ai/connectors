import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
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
    input: {
        schema: {
            // max_videos is a secondary knob (channel-mode only) the
            // estimate reads — WE default it at the binding to the
            // actor's VERIFIED published server default (10); unwrap
            // keeps the inner int/min(1)/max(200) checks (D25)
            body: zYoutubeVideoTranscriptBody.extend({
                max_videos: zYoutubeVideoTranscriptBody.shape.max_videos
                    .unwrap().default(10),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            // the actor's charge-event this leaf line joins to
            vendor: "apify-default-dataset-item",
            // survey-pinned GOLD-tier event price
            consumes: { credit: "default", amount: 0.005 },
        },
        /** MODE-aware (PR #2 finding): youtube_url mode returns exactly 1;
         *  channel mode caps at max_videos, defaulted at the binding to
         *  the actor's OWN server default (10) — materialized into the
         *  body before any hook runs, so the estimate is exact. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const amount =
                body.channel_url !== undefined && body.channel_url !== ""
                    ? body.max_videos
                    : 1;
            return { counts: { "RESULT": amount } };
        },
    },
});
