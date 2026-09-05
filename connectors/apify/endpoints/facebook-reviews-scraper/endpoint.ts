import { defineEndpoint } from "@shared/core";
import { zFacebookReviewsScraperBody } from "./schema/inputs.ts";

/**
 * apify/facebook-reviews-scraper — List Facebook Reviews. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "List Facebook Reviews",
        summary: "Scrape reviews from Facebook business pages with " +
            "ratings and reviewer info.",
        description: "Scrapes reviews from one or more Facebook business " +
            "pages. Returns review text, star ratings, timestamps, " +
            "review URLs, likes and comments counts, and basic " +
            "reviewer metadata for reputation monitoring and " +
            "customer feedback analysis across public Facebook " +
            "pages.",
        docsUrl: "https://apify.com/apify/facebook-reviews-scraper",
        categories: ["facebook", "company-reviews"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/apify~facebook-reviews-scraper/runs",
    },
    input: { schema: { body: zFacebookReviewsScraperBody } },
});
