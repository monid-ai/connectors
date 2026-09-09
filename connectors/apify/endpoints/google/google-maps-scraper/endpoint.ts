import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
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
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/damilo/google-maps-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/damilo~google-maps-scraper/runs",
    },
    input: { schema: { body: zGoogleMapsScraperBody } },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** max_results caps the run — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        estimate: presets.estimate.limitIsExact("max_results", 3),
    },
});
