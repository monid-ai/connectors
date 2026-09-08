import { z } from "zod";

/**
 * streamers/youtube-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/streamers~youtube-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zYoutubeScraperBody = z.object({
    "searchQueries": z.array(z.any()).describe(
        "Enter search terms just like you would enter it in YouTube's search bar.",
    ).optional(),
    "maxResults": z.number().int().min(0).max(999999).describe(
        "Limit the number of videos you want to crawl. If you scrape a channel, acts as a limit for regular videos.",
    ).optional(),
    "maxResultsShorts": z.number().int().min(0).max(999999).describe(
        "Limit the number of Shorts videos you want to crawl.",
    ).optional(),
    "maxResultStreams": z.number().int().min(0).max(999999).describe(
        "Limit the number of Stream videos you want to crawl.",
    ).optional(),
    "startUrls": z.array(z.any()).describe(
        "Enter a link to a YouTube video, channel, playlist, hashtag or search results page. You can also import a CSV file or Google Sheet with a list of URLs.Note: Input from Search term will be ignored when using this option. If you only want to scrape shorts/streams, set Maximum search results to 0, o...",
    ).optional(),
    "downloadSubtitles": z.boolean().describe(
        "If set to true, the scraper will download subtitles for the video and convert them to .srt format.",
    ).optional(),
    "subtitlesLanguage": z.enum([
        "any",
        "en",
        "de",
        "es",
        "fr",
        "it",
        "ja",
        "ko",
        "nl",
        "pt",
        "ru",
    ]).describe(
        "Language to download subtitles in.Note: Download subtitles must be turned on for this option to work.",
    ).optional(),
    "subtitlesFormat": z.enum(["srt", "vtt", "xml", "plaintext"]).describe(
        "Select in what format you want to download subtitles",
    ).optional(),
    "sortingOrder": z.enum(["relevance", "rating", "date", "views"]).describe(
        "Select Youtube sorting parameter for search",
    ).optional(),
    "dateFilter": z.enum(["hour", "today", "week", "month", "year"]).describe(
        "Select Youtube upload date filter for search",
    ).optional(),
    "videoType": z.enum(["video", "movie"]).describe(
        "Select Youtube video type filter for search",
    ).optional(),
    "lengthFilter": z.enum(["under4", "between420", "plus20"]).describe(
        "Select Youtube video length filter for search",
    ).optional(),
    "isHD": z.boolean().describe("Will apply the HD filter for search")
        .optional(),
    "hasSubtitles": z.boolean().describe(
        "Will apply the Subtitles/CC filter for search",
    ).optional(),
    "hasCC": z.boolean().describe(
        "Will apply the Creative Commons filter for search",
    ).optional(),
    "is3D": z.boolean().describe("Will apply the 3D filter for search")
        .optional(),
    "isLive": z.boolean().describe("Will apply the Live filter for search")
        .optional(),
    "isBought": z.boolean().describe(
        "Will apply the Purchased filter for search",
    ).optional(),
    "is4K": z.boolean().describe("Will apply the 4K filter for search")
        .optional(),
    "is360": z.boolean().describe(
        "Will apply the 360 degrees filter for search",
    ).optional(),
    "hasLocation": z.boolean().describe(
        "Will apply the Location filter for search",
    ).optional(),
    "isHDR": z.boolean().describe("Will apply the HDR filter for search")
        .optional(),
    "isVR180": z.boolean().describe("Will apply the VR180 filter for search")
        .optional(),
    "oldestPostDate": z.string().describe(
        "Only posts uploaded after or on this date will be scraped. Alternatively, specify how old the scraped videos should be in days. Putting 1 day will get you only today's posts, 2 days - yesterday's and today's, and so on. Note, that if you select this, sorting parameter will be auto-reset to NEWEST",
    ).optional(),
    "sortVideosBy": z.enum(["NEWEST", "POPULAR", "OLDEST"]).describe(
        "Maps to the sorting buttons on the top of the channel's 'Videos', 'Shorts' and 'Live' pages.",
    ).optional(),
    "aiVideoDescription": z.boolean().describe(
        "If enabled, uses AI to generate a time-segmented description of the video, covering both visual and audio content for each segment.",
    ).optional(),
    "aiVideoSummary": z.boolean().describe(
        "If enabled, uses AI to generate a concise conceptual summary of the video covering both visual and audio content.",
    ).optional(),
    "saveSubsToKVS": z.boolean().describe(
        "If set to true, the scraper will save the downloaded subtitles to the key-value store. Note: Download subtitles must be turned on for this option to work.",
    ).optional(),
    "preferAutoGeneratedSubtitles": z.boolean().describe(
        "If set to true, automatically generated subtitles are preferred to user subtitles. Note: A subtitle language must be selected and download subtitles must be turned on for this option to work.",
    ).optional(),
});
