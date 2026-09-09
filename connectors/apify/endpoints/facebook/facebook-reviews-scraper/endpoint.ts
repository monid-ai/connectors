import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
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
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apify/facebook-reviews-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apify~facebook-reviews-scraper/runs",
    },
    input: { schema: { body: zFacebookReviewsScraperBody } },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids = the actor's charge-event names, VERBATIM
            // (live survey) — the broker card row key and the join key for
            // the stashed run-record rates (design D19)
            components: {
                "actor-start": { kind: UsageModelKind.PER_CALL },
                "review": { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
            },
        },
        /** resultsLimit reviews per page url — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        estimate: presets.estimate.perQueryLimit(
            "resultsLimit",
            "startUrls",
            3,
        ),
    },
});
