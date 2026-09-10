import { z } from "zod";

/**
 * dataovercoffee/youtube-channel-business-email-scraper — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-10 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zYoutubeChannelBusinessEmailScraperOutputItem = z.object({
    Query: z.string().describe(
        "The original YouTube channel ID or handle that was queried",
    ).optional(),
    ChannelId: z.string().describe("The unique YouTube channel ID").optional(),
    Email: z.any().describe("The business email address found for the channel")
        .optional(),
    Status: z.enum(["EMAIL_AVAILABLE", "EMAIL_PENDING", "EMAIL_NOT_FOUND"])
        .describe("Status of the email extraction").optional(),
    ChannelHandle: z.any().describe(
        "The YouTube channel handle (e.g., @channelname)",
    ).optional(),
    SubscriberCount: z.any().describe("Number of subscribers on the channel")
        .optional(),
    ChannelName: z.any().describe("Display name of the YouTube channel")
        .optional(),
    Country: z.any().describe("Country associated with the channel").optional(),
    TotalViews: z.any().describe("Total view count across all videos")
        .optional(),
    TotalVideosCount: z.any().describe("Total number of videos on the channel")
        .optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zYoutubeChannelBusinessEmailScraperOutput = z.array(
    zYoutubeChannelBusinessEmailScraperOutputItem.or(
        z.record(z.string(), z.unknown()),
    ),
);
