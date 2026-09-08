import { z } from "zod";

/**
 * clockworks/tiktok-video-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/clockworks~tiktok-video-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zTiktokVideoScraperBody = z.object({
    "postURLs": z.array(z.any()).describe(
        "Add the URLs of posted videos you want to scrape. You can enter URLs one by one, or you can upload or link to a text file.",
    ),
    "scrapeRelatedVideos": z.boolean().describe(
        "Tick to scrape related videos for the post URLs you provide. - The maximum number of scraped related videos is set by the `resultsPerPage` count.",
    ).optional(),
    "resultsPerPage": z.number().int().min(1).max(1000000).describe(
        "Add the number of related videos you want to scrape for each post URL. This field is applicable when the Scrape related videos option is enabled.",
    ).optional(),
    "shouldDownloadVideos": z.boolean().describe(
        "This is a charged add-on. Tick to download TikTok videos.",
    ).optional(),
    "shouldDownloadCovers": z.boolean().describe(
        "Tick to download TikTok video cover images (thumbnails). Note that this will increase time and costs needed to extract the data.",
    ).optional(),
    "downloadSubtitlesOptions": z.enum([
        "NEVER_DOWNLOAD_SUBTITLES",
        "DOWNLOAD_SUBTITLES",
        "DOWNLOAD_AND_TRANSCRIBE_VIDEOS_WITHOUT_SUBTITLES",
        "TRANSCRIBE_ALL_VIDEOS",
    ]).describe(
        "Choose how to handle subtitles and audio transcription for input videos. Subtitles are provided by TikTok for some videos, and transcription means that this Actor will use speech-to-text AI to generate video transcript. Transcripts are charged as an extra event according to your plan.",
    ).optional(),
    "shouldDownloadSlideshowImages": z.boolean().describe(
        "Tick to download TikTok slideshow images. Note that this will increase costs and time required for scraping.",
    ).optional(),
    "videoKvStoreIdOrName": z.string().describe(
        "Name (or ID) of the Key Value Store where the videos and other media like thumbnails will be stored. Omit to store in the default one. Using this option will provide a named Key-Value store can help bypass data retention and store the content forever until the store is manually deleted.The Key-Va...",
    ).optional(),
});
