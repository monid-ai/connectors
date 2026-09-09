import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
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
    input: {
        schema: {
            // `max_results` is the primary limiting knob (exact result
            // cap) — WE require it at the binding: the estimate must be
            // deducible to price the hold (D25)
            body: zGoogleMapsScraperBody.required({ max_results: true }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            // vendor charge event: "apify-default-dataset-item"
            // survey-pinned GOLD-tier event price
            consumes: { credit: "default", amount: 0.003 },
        },
        /** max_results caps the run exactly (v1 LIMIT_IS_EXACT) —
         *  required at the binding, so the estimate is pure arithmetic
         *  (D25). */
        estimate: ({ data }) => ({
            counts: {
                "RESULT": data.input.body.max_results,
            },
        }),
    },
});
