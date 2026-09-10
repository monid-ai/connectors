import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookReviewsScraperBody } from "./schema/inputs.ts";
import { zFacebookReviewsScraperOutput } from "./schema/output.ts";

/**
 * apify/facebook-reviews-scraper — List Facebook Reviews. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
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
            // server default) — WE require it at the binding (inner
            // min(1) kept by .required, zod 4): the estimate must be
            // deducible to price the hold (D25)
            body: zFacebookReviewsScraperBody.required({
                resultsLimit: true,
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zFacebookReviewsScraperOutput },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids are OUR snake_case keys — the actor's
            // charge-event names normalize onto them (strip apify-
            // prefix, kebab/camel → snake), which is the drift
            // guard's derived join (design D28)
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.001 },
                },
                review: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "reviews",
                    consumes: { credit: "default", amount: 0.0014 },
                },
            },
        },
        /** resultsLimit reviews per page url (v1 PER_QUERY_LIMIT) —
         *  resultsLimit is required at the binding; startUrls is
         *  actor-required, and an empty batch estimates 0, which is
         *  correct (D25). */
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
