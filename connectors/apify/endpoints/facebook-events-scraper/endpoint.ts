import { defineEndpoint } from "@shared/core";
import { zFacebookEventsScraperBody } from "./schema/inputs.ts";

/**
 * apify/facebook-events-scraper — Search Facebook Events. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Facebook Events",
        summary: "Extract Facebook event listings by search query, page, " +
            "or event URL.",
        description: "Extracts event listings and metadata from Facebook " +
            "pages, event URLs, or search queries with filters. " +
            "Returns event names, schedules (start date and time), " +
            "descriptions, locations, organizer information, " +
            "interested/attending counts, and ticket details for " +
            "event intelligence and local activity tracking.",
        docsUrl: "https://apify.com/apify/facebook-events-scraper",
        categories: ["facebook"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/apify~facebook-events-scraper/runs",
    },
    input: { schema: { body: zFacebookEventsScraperBody } },
});
