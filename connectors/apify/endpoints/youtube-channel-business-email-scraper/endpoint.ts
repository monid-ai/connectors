import { defineEndpoint } from "@shared/core";
import { zYoutubeChannelBusinessEmailScraperBody } from "./schema/inputs.ts";

/**
 * dataovercoffee/youtube-channel-business-email-scraper — Find YouTube Channel Emails. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Find YouTube Channel Emails",
        summary: "Extract business emails from YouTube channels by URL, " +
            "handle, or channel ID.",
        description: "Extracts the business email a creator lists behind the " +
            "protected email gate on their YouTube channel About " +
            "page, from channel URLs, handles, or 24-character " +
            "channel IDs. Returns the business email address per " +
            "channel with channel name, channel ID, and extraction " +
            "status. Supports batches of up to 1,000 channels per " +
            "run and an optional forced fresh scrape of channels " +
            "seen before. Suited for creator outreach, influencer " +
            "marketing, and lead-generation pipelines keyed by " +
            "YouTube channel.",
        docsUrl:
            "https://apify.com/dataovercoffee/youtube-channel-business-email-scraper",
        categories: ["youtube"],
    },
    request: {
        method: "POST",
        path:
            "/v2/acts/dataovercoffee~youtube-channel-business-email-scraper/runs",
    },
    input: { schema: { body: zYoutubeChannelBusinessEmailScraperBody } },
});
