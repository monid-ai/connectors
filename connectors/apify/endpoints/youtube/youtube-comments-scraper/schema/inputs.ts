import { z } from "zod";

/**
 * streamers/youtube-comments-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/streamers~youtube-comments-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zYoutubeCommentsScraperBody = z.object({
    "startUrls": z.array(z.any()).describe(
        "Enter a link to a specific Youtube video YouTube video. You can also import a CSV file or Google Sheet with a list of URLs.",
    ),
    "maxComments": z.number().int().min(1).describe(
        "Limit the number of comments you want to scrape per video.",
    ).optional(),
    "sortCommentsBy": z.enum(["TOP_COMMENTS", "NEWEST_FIRST"]).describe(
        "Select Youtube sorting parameter for comments",
    ).optional(),
    "oldestCommentDate": z.string().describe(
        "Only comments published after or on this date will be scraped. Alternatively, specify how old the scraped comments should be. Putting 1 day will get you only today's comments, 2 days - yesterday's and today's, and so on. Note, that if you select this, sorting parameter will be auto-reset to newes...",
    ).optional(),
});
