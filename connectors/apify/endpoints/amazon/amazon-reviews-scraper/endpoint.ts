import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAmazonReviewsScraperBody } from "./schema/inputs.ts";

/**
 * axesso_data/amazon-reviews-scraper — List Amazon Reviews. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "List Amazon Reviews",
        summary: "Extract real-time Amazon product reviews by ASIN with " +
            "ratings, text, and reviewer details.",
        description:
            "Extracts real-time product reviews from Amazon by ASIN. " +
            "Returns per-review ratings, titles, full review text, " +
            "dates, reviewer identity and verification status, " +
            "helpful-vote counts, attached media, and aggregated " +
            "rating distributions. Supports batch processing of " +
            "multiple ASINs with filtering by star rating, keyword, " +
            "reviewer type, and media type across multiple Amazon " +
            "domains.",
        docsUrl: "https://apify.com/axesso_data/amazon-reviews-scraper",
        categories: ["amazon"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/axesso_data/amazon-reviews-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/axesso_data~amazon-reviews-scraper/runs",
    },
    input: { schema: { body: zAmazonReviewsScraperBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            // the actor's charge-event this leaf line joins to
            vendor: "apify-default-dataset-item",
            // survey-pinned GOLD-tier event price
            consumes: { credit: "default", amount: 0.0009 },
        },
        /** one result per input entry (one asin each, v1 ONE_PER_QUERY) —
         *  `input` is actor-required; an empty batch is a no-op run and
         *  estimates 0, which is correct (D25). */
        estimate: ({ data }) => ({
            counts: {
                "RESULT": data.input.body.input.length,
            },
        }),
    },
});
