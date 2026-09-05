import { defineEndpoint } from "@shared/core";
import { zGoogleMapsScraperBody } from "./schema/inputs.ts";

/**
 * damilo/google-maps-scraper — Search Google Maps. Pure data; the async
 * machinery is inherited leaf-wise from the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Google Maps",
        summary:
            "Scrape local business listings from Google Maps by keyword and location.",
        description:
            "Scrapes local business listings from Google Maps by keyword " +
            "and location. Returns business names, addresses, phone " +
            "numbers, websites, geographic coordinates, ratings, review " +
            "counts, opening hours, categories, and images. Supports " +
            "multilingual worldwide searches and bulk extraction without a " +
            "Google Maps API key; `max_results` directly controls the " +
            "result count. Suited for lead generation, local SEO, and " +
            "competitor research. Runs asynchronously.",
        docsUrl: "https://apify.com/damilo/google-maps-scraper",
        categories: ["maps"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/damilo~google-maps-scraper/runs",
    },
    input: { schema: { body: zGoogleMapsScraperBody } },
});
