import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
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
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/compass/google-maps-reviews-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/compass~google-maps-reviews-scraper/runs",
    },
    input: {
        schema: {
            // the actor's published maxReviews "default" is 10000000 — an
            // "all reviews" sentinel, not a usable server default — WE
            // require it (inner min(1) kept by .required, zod 4): the
            // estimate must be deducible to price the hold (D24). The two
            // target lists (startUrls, placeIds) are either/or on the
            // actor with absent ≡ empty — WE materialize [] so the
            // multiplier is deterministic after validation (D24).
            body: zGoogleMapsReviewsScraperBody
                .required({ "maxReviews": true })
                .extend({
                    "startUrls": zGoogleMapsReviewsScraperBody.shape
                        .startUrls.unwrap().default([]),
                    "placeIds": zGoogleMapsReviewsScraperBody.shape
                        .placeIds.unwrap().default([]),
                }),
        },
    },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids = the actor's charge-event names, VERBATIM
            // (live survey) — the broker card row key and the join key for
            // the stashed run-record rates (design D19)
            components: {
                "apify-actor-start": {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                },
                "review-scraped": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "reviews",
                },
            },
        },
        /** maxReviews per place (v1 PER_QUERY_LIMIT) × BOTH target lists
         *  (startUrls AND placeIds — the old startUrls-only multiplier
         *  undercounted placeIds runs) — required/materialized at the
         *  binding, so the estimate is pure arithmetic (D24). */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "review-scraped": body.maxReviews *
                        (body.startUrls.length + body.placeIds.length),
                },
            };
        },
    },
});
