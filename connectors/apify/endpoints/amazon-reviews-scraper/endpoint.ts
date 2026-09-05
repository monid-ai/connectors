import { defineEndpoint } from "@shared/core";
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
    request: {
        method: "POST",
        path: "/v2/acts/axesso_data~amazon-reviews-scraper/runs",
    },
    input: { schema: { body: zAmazonReviewsScraperBody } },
});
