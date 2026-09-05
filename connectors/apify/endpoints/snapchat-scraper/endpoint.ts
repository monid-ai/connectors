import { defineEndpoint } from "@shared/core";
import { zSnapchatScraperBody } from "./schema/inputs.ts";

/**
 * automation-lab/snapchat-scraper — Get Snapchat Profile. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Snapchat Profile",
        summary: "Scrape public Snapchat profile cards by username or " +
            "profile URL.",
        description: "Scrapes public Snapchat profile cards from usernames, " +
            "@handles, or profile URLs without a Snapchat login. " +
            "Returns username, display name, profile type, " +
            "subscriber count, bio, website, verified badge, " +
            "category and subcategory, profile picture and Snapcode " +
            "URLs, hero image, story and highlight/Spotlight/lens " +
            "indicators and counts, related accounts, business " +
            "profile ID and address. Supports batches of usernames " +
            "and an optional expansion to up to 50 related public " +
            "accounts per run. Suited for creator discovery, " +
            "influencer vetting, and brand audience research on " +
            "Snapchat.",
        docsUrl: "https://apify.com/automation-lab/snapchat-scraper",
        categories: ["snapchat"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/automation-lab~snapchat-scraper/runs",
    },
    input: { schema: { body: zSnapchatScraperBody } },
});
