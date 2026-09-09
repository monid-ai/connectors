import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
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
    input: {
        schema: {
            // the actor accepts an absent resultsLimit (scrapes as many
            // reviews as possible; prefill 10 is editor-only, NOT a
            // server default) — WE require it (inner min(1) kept by
            // .required, zod 4) and require a non-empty startUrls batch:
            // the estimate must be deducible to price the hold (D24)
            body: zFacebookReviewsScraperBody
                .required({ "resultsLimit": true })
                .extend({
                    "startUrls": zFacebookReviewsScraperBody.shape
                        .startUrls.min(1),
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
                "actor-start": {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                },
                "review": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "reviews",
                },
            },
        },
        /** resultsLimit reviews per page url (v1 PER_QUERY_LIMIT) — both
         *  required at the binding, so the estimate is pure arithmetic
         *  (D24). */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "review": body.resultsLimit * body.startUrls.length,
                },
            };
        },
    },
});
