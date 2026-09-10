import { z } from "zod";

/**
 * starvibe/youtube-video-transcript — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-10 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zYoutubeVideoTranscriptOutputItem = z.object({
    channel_id: z.string().describe("ID of the YouTube channel").optional(),
    channel_name: z.string().describe("Name of the YouTube channel").optional(),
    channel_thumbnail: z.string().describe(
        "Thumbnail URL of the YouTube channel",
    ).optional(),
    channel_username: z.string().describe(
        "Custom URL or handle-derived username of the YouTube channel",
    ).optional(),
    comment_count: z.number().int().describe("Number of comments on the video")
        .optional(),
    duration_seconds: z.number().int().describe(
        "Duration of the video in seconds",
    ).optional(),
    language: z.string().describe("Primary language of the video").optional(),
    like_count: z.number().int().describe("Number of likes on the video")
        .optional(),
    subscriber_count: z.number().int().describe(
        "Number of subscribers on the channel",
    ).optional(),
    timestamp: z.number().int().describe("Unix timestamp of the video")
        .optional(),
    title: z.string().describe("Title of the video").optional(),
    transcript: z.array(z.object({
        text: z.string().describe("Text content of the transcript segment")
            .optional(),
        start: z.number().describe(
            "Start time of the transcript segment in seconds",
        ).optional(),
        end: z.number().describe(
            "End time of the transcript segment in seconds",
        ).optional(),
        duration: z.number().describe(
            "Duration of the transcript segment in seconds",
        ).optional(),
    })).describe("Array of transcript segments").optional(),
    transcript_text: z.string().describe(
        "Full transcript as a plain string without timestamps",
    ).optional(),
    published_at: z.string().describe(
        "Published date of the video in ISO format",
    ).optional(),
    url: z.string().describe("URL of the video").optional(),
    video_id: z.string().describe("ID of the YouTube video").optional(),
    view_count: z.number().int().describe("Number of views on the video")
        .optional(),
    geo_restrict: z.any().describe("Geographic restrictions for the video")
        .optional(),
    status: z.string().describe("Status of the video retrieval process")
        .optional(),
    message: z.string().describe(
        "Message describing the result of the video retrieval",
    ).optional(),
    available_languages: z.array(z.string()).describe(
        "Available languages for the transcript",
    ).optional(),
    selected_language: z.string().describe(
        "Selected language for the transcript",
    ).optional(),
    is_auto_generated: z.boolean().describe(
        "Whether the transcript is auto-generated",
    ).optional(),
    description: z.string().describe("Description of the video").optional(),
    thumbnail: z.string().describe("Thumbnail URL of the video").optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zYoutubeVideoTranscriptOutput = z.array(
    zYoutubeVideoTranscriptOutputItem.or(z.record(z.string(), z.unknown())),
);
