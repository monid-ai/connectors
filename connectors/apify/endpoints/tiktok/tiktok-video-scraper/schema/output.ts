import { z } from "zod";

/**
 * clockworks/tiktok-video-scraper — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-10 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zTiktokVideoScraperOutputItem = z.object({
    id: z.string().describe("Unique identifier of the TikTok video").optional(),
    text: z.string().describe("Caption text of the TikTok video").optional(),
    textLanguage: z.string().describe("Detected language of the video caption")
        .optional(),
    createTime: z.number().describe("Unix timestamp when the video was created")
        .optional(),
    createTimeISO: z.string().describe(
        "ISO 8601 formatted creation date and time",
    ).optional(),
    isMuted: z.boolean().describe("Whether the video audio is muted")
        .optional(),
    webVideoUrl: z.string().describe("URL to view the video on TikTok")
        .optional(),
    submittedVideoUrl: z.string().describe(
        "The original input URL submitted to find this video",
    ).optional(),
    originalVideoDetail: z.object({}).describe(
        "Full video detail object for the original version of this video, if it was re-uploaded",
    ).optional(),
    locationCreated: z.string().describe(
        "Country code where the video was created",
    ).optional(),
    isAd: z.boolean().describe("Whether the video is a sponsored advertisement")
        .optional(),
    authorMeta: z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        profileUrl: z.string().optional(),
        verified: z.boolean().optional(),
        privateAccount: z.boolean().optional(),
        nickName: z.string().optional(),
        avatar: z.string().optional(),
        signature: z.string().optional(),
        bioLink: z.string().optional(),
        region: z.string().optional(),
        following: z.number().optional(),
        fans: z.number().optional(),
        video: z.number().optional(),
        heart: z.number().optional(),
        digg: z.number().optional(),
        friends: z.number().optional(),
        commerceUserInfo: z.object({
            commerceUser: z.boolean().optional(),
            category: z.string().optional(),
        }).optional(),
        isUnderAge18: z.boolean().optional(),
        roomId: z.string().optional(),
        ttSeller: z.boolean().optional(),
        createTime: z.number().optional(),
        followDatasetUrl: z.string().optional(),
        originalAvatarUrl: z.string().optional(),
    }).describe("Metadata about the video author").optional(),
    musicMeta: z.object({
        musicName: z.string().optional(),
        musicAuthor: z.string().optional(),
        playUrl: z.string().optional(),
        coverMediumUrl: z.string().optional(),
        musicOriginal: z.boolean().optional(),
        musicAlbum: z.string().optional(),
        musicId: z.string().optional(),
        originalCoverMediumUrl: z.string().optional(),
    }).describe("Metadata about the background music used in the video")
        .optional(),
    videoMeta: z.object({
        height: z.number().optional(),
        width: z.number().optional(),
        duration: z.number().optional(),
        coverUrl: z.string().optional(),
        originalCoverUrl: z.string().optional(),
        definition: z.string().optional(),
        format: z.string().optional(),
        subtitleLinks: z.array(z.object({
            language: z.string().optional(),
            downloadLink: z.string().optional(),
            tiktokLink: z.string().optional(),
            source: z.string().optional(),
            sourceUnabbreviated: z.string().optional(),
            version: z.string().optional(),
        })).optional(),
        transcriptionLink: z.string().optional(),
        downloadAddr: z.string().optional(),
        originalDownloadAddr: z.string().optional(),
    }).describe("Technical metadata about the video file").optional(),
    locationMeta: z.object({
        address: z.string().optional(),
        city: z.string().optional(),
        cityCode: z.string().optional(),
        countryCode: z.string().optional(),
        locationName: z.string().optional(),
        locationId: z.string().optional(),
    }).describe("Geographic location metadata if the video is geotagged")
        .optional(),
    mediaUrls: z.array(z.string()).describe(
        "Array of media URLs associated with the video",
    ).optional(),
    slideshowImageLinks: z.array(z.object({
        tiktokLink: z.string().optional(),
        downloadLink: z.string().optional(),
    })).describe("Image links for slideshow-style posts").optional(),
    diggCount: z.number().describe(
        "Number of likes (hearts) the video has received",
    ).optional(),
    shareCount: z.number().describe("Number of times the video has been shared")
        .optional(),
    playCount: z.number().describe("Number of times the video has been viewed")
        .optional(),
    commentCount: z.number().describe("Number of comments on the video")
        .optional(),
    collectCount: z.number().describe(
        "Number of times the video has been saved/bookmarked",
    ).optional(),
    repostCount: z.number().describe(
        "Number of times the video has been reposted",
    ).optional(),
    mentions: z.array(z.string()).describe(
        "Array of usernames mentioned in the video caption",
    ).optional(),
    detailedMentions: z.array(z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        nickName: z.string().optional(),
        profileUrl: z.string().optional(),
        postUrl: z.string().optional(),
        secUid: z.string().optional(),
    })).describe("Detailed information about users mentioned in the caption")
        .optional(),
    hashtags: z.array(z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        title: z.string().optional(),
        cover: z.string().optional(),
    })).describe("Array of hashtags used in the video caption").optional(),
    effectStickers: z.array(z.object({
        ID: z.string().optional(),
        name: z.string().optional(),
        stickerStats: z.object({
            useCount: z.number().optional(),
        }).optional(),
    })).describe("Visual effects and stickers applied to the video").optional(),
    isSlideshow: z.boolean().describe(
        "Whether the post is a slideshow of images rather than a video",
    ).optional(),
    isPinned: z.boolean().describe(
        "Whether the video is pinned to the author's profile",
    ).optional(),
    isSponsored: z.boolean().describe(
        "Whether the video contains sponsored content",
    ).optional(),
    hasTikTokShopProduct: z.boolean().describe(
        "Whether the video has a TikTok Shop product attached. Only meaningful when present: an omitted value means we could not determine it, not that the video has no product. Search results are the case where TikTok often does not expose the signal.",
    ).optional(),
    commentsDatasetUrl: z.string().describe(
        "URL to the dataset containing comments for this video, if collected separately",
    ).optional(),
    input: z.string().describe("Original input value used to find this video")
        .optional(),
    url: z.string().describe("URL associated with an error result").optional(),
    error: z.string().describe("Error message if the item could not be scraped")
        .optional(),
    errorCode: z.string().describe("Machine-readable error code").optional(),
    invalidUrls: z.array(z.any()).describe(
        "List of invalid URLs that could not be processed",
    ).optional(),
    fromProfileSection: z.enum(["videos", "reposts"]).describe(
        "Profile section this video was scraped from",
    ).optional(),
    searchQuery: z.string().describe("Search query used to find this video")
        .optional(),
    searchHashtag: z.object({
        name: z.string().optional(),
        views: z.number().optional(),
    }).describe("Hashtag used to find this video").optional(),
    searchMusic: z.object({
        musicTag: z.string().optional(),
        videos: z.string().optional(),
    }).describe("Music used to find this video").optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zTiktokVideoScraperOutput = z.array(
    zTiktokVideoScraperOutputItem.or(z.record(z.string(), z.unknown())),
);
