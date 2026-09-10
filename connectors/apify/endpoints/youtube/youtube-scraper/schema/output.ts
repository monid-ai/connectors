import { z } from "zod";

/**
 * streamers/youtube-scraper — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-10 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zYoutubeScraperOutputItem = z.object({
    title: z.string().describe("The title of the YouTube video").optional(),
    id: z.string().describe("The unique YouTube video ID").optional(),
    url: z.string().describe("The full URL of the video").optional(),
    viewCount: z.number().describe("The number of views on the video")
        .optional(),
    date: z.string().describe("The publish date of the video").optional(),
    duration: z.string().describe("The length of the video in time format")
        .optional(),
    type: z.enum(["video", "shorts", "stream"]).describe(
        "The type of video content",
    ).optional(),
    thumbnailUrl: z.string().describe("URL of the video thumbnail image")
        .optional(),
    input: z.string().describe(
        "The input provided by the user (URL, channel name, or search query)",
    ).optional(),
    channelName: z.string().describe(
        "The name of the channel that published the video",
    ).optional(),
    channelUrl: z.string().describe("The URL of the channel").optional(),
    channelUsername: z.string().describe("The @username handle of the channel")
        .optional(),
    translatedTitle: z.string().describe(
        "The translated title if YouTube provided a translation",
    ).optional(),
    translatedText: z.string().describe(
        "The translated description if YouTube provided a translation",
    ).optional(),
    likes: z.number().describe("The number of likes on the video").optional(),
    location: z.string().describe(
        "Geographic location associated with the video",
    ).optional(),
    channelId: z.string().describe("The unique channel ID").optional(),
    commentsCount: z.number().describe(
        "The total number of comments on the video",
    ).optional(),
    text: z.string().describe("The video description text").optional(),
    descriptionLinks: z.array(z.object({
        text: z.string().optional(),
        url: z.string().optional(),
    })).describe("Links found in the video description").optional(),
    subtitles: z.array(z.object({
        srtUrl: z.string().optional(),
        type: z.string().optional(),
        language: z.string().optional(),
        srt: z.string().optional(),
    })).describe("Available subtitles for the video").optional(),
    aiVideoDescription: z.array(z.object({
        startSecond: z.number().int().optional(),
        endSecond: z.number().int().optional(),
        displayTime: z.string().optional(),
        description: z.string().optional(),
    })).describe(
        "AI-generated, time-segmented description of the video (only when AI enrichment is enabled)",
    ).optional(),
    aiVideoSummary: z.string().describe(
        "AI-generated summary of the video (only when AI enrichment is enabled)",
    ).optional(),
    transcriptionUrl: z.string().describe(
        "URL of the AI-generated transcript stored in the key-value store. Present only when a transcription option is selected in 'Transcription & subtitles'",
    ).optional(),
    fromYTUrl: z.string().describe(
        "The YouTube URL where this video was found (e.g. search results or channel page)",
    ).optional(),
    order: z.number().describe(
        "The position of the video in the list as it appeared on the source page",
    ).optional(),
    commentsTurnedOff: z.boolean().describe(
        "Whether comments are disabled on the video",
    ).optional(),
    isMonetized: z.boolean().describe("Whether the video is monetized")
        .optional(),
    hashtags: z.array(z.string()).describe("Hashtags associated with the video")
        .optional(),
    isMembersOnly: z.boolean().describe(
        "Whether the video is restricted to channel members",
    ).optional(),
    collaborators: z.array(z.object({
        name: z.string().optional(),
        username: z.string().optional(),
        url: z.string().optional(),
    })).describe("Collaborators on the video").optional(),
    isPaidContent: z.boolean().describe(
        "Whether the video requires payment to access",
    ).optional(),
    numberOfSubscribers: z.number().describe(
        "Number of subscribers to the channel",
    ).optional(),
    channelTotalVideos: z.number().describe(
        "Total number of videos on the channel",
    ).optional(),
    channelDescription: z.string().describe("The channel's description")
        .optional(),
    channelLocation: z.string().describe("The channel's location").optional(),
    channelJoinedDate: z.string().describe("When the channel was created")
        .optional(),
    channelTotalViews: z.number().describe(
        "Total views across all channel videos",
    ).optional(),
    isChannelVerified: z.boolean().describe("Whether the channel is verified")
        .optional(),
    channelBannerUrl: z.string().describe("URL of the channel banner")
        .optional(),
    channelAvatarUrl: z.string().describe("URL of the channel avatar")
        .optional(),
    isAgeRestricted: z.boolean().describe(
        "Whether the channel is age-restricted",
    ).optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zYoutubeScraperOutput = z.array(
    zYoutubeScraperOutputItem.or(z.record(z.string(), z.unknown())),
);
