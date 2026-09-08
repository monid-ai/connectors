import { z } from "zod";

/**
 * starvibe/youtube-video-transcript — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/starvibe~youtube-video-transcript/builds/default →
 * actorDefinition.input) on 2026-09-03 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zYoutubeVideoTranscriptBody = z.object({
    "youtube_url": z.string().describe(
        "Enter a valid YouTube video URL (e.g., https://www.youtube.com/watch?v=video_id, https://youtu.be/video_id, or https://www.youtube.com/shorts/video_id). Use this for fetching a single video, paired with 'language' for transcript. Do not combine with channel filtering fields.",
    ).optional(),
    "language": z.string().describe(
        "Language of the subtitles in ISO 639-1 format, e.g., `en`, `fr`. Applicable to both youtube_url and channel_url. Leave blank for default language.",
    ).optional(),
    "channel_url": z.string().describe(
        "Enter a valid YouTube channel URL (e.g., https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx or https://www.youtube.com/@channelhandle). Use this to fetch videos from the channel, paired with 'max_videos', 'start_date', and 'end_date' for limiting and filtering results.",
    ).optional(),
    "max_videos": z.number().int().min(1).max(200).describe(
        "Maximum number of videos to fetch from the channel (optional, default: 10, range: 1 to 200). Only applicable and used with channel_url; ignored for youtube_url. Combine with start_date/end_date for filtered results.",
    ).optional(),
    "start_date": z.string().describe(
        "Start date for filtering videos by upload date (format: YYYY-MM-DD or ISO 8601, optional). Only applicable and used with channel_url; ignored for youtube_url. Videos uploaded on or after this date will be fetched.",
    ).optional(),
    "end_date": z.string().describe(
        "End date for filtering videos by upload date (format: YYYY-MM-DD or ISO 8601, optional). Only applicable and used with channel_url; ignored for youtube_url. Videos uploaded on or before this date will be fetched.",
    ).optional(),
    "include_transcript_text": z.boolean().describe(
        "Include the full transcript as a plain string without timestamps (transcript_text field). Default is off to reduce response size. Enable this if you need the transcript as a single text block.",
    ).optional(),
});
