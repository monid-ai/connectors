import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
import { zGoogleMapsReviewsScraperBody } from "./schema/inputs.ts";

/**
 * compass/google-maps-reviews-scraper — List Google Maps Reviews. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "List Google Maps Reviews",
        summary: "Extract reviews and place metadata from Google Maps " +
            "place URLs.",
        description: "Extracts reviews and place metadata from Google Maps " +
            "for specified location URLs. Returns review text, star " +
            "ratings, publish timestamps, reviewer profile metadata, " +
            "owner responses, review images, per-service ratings, " +
            "and aggregated place-level scores. Supports " +
            "multilingual reviews and translations.",
        docsUrl: "https://apify.com/compass/google-maps-reviews-scraper",
        categories: ["maps", "company-reviews"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/compass~google-maps-reviews-scraper/runs",
    },
    input: { schema: { body: zGoogleMapsReviewsScraperBody } },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids = the actor's charge-event names, VERBATIM
            // (live survey) — the broker card row key and the join key for
            // the stashed run-record rates (design D19)
            components: {
                "apify-actor-start": { kind: UsageModelKind.PER_CALL },
                "review-scraped": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
            },
        },
        /** maxReviews per place url — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        estimate: presets.estimate.perQueryLimit(
            "maxReviews",
            "startUrls",
            3,
        ),
    },
});
