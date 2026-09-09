import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAmazonReviewsExtractorBody } from "./schema/inputs.ts";

/**
 * web_wanderer/amazon-reviews-extractor — List Amazon Reviews (Extractor). Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "List Amazon Reviews (Extractor)",
        summary: "Scrape Amazon reviews across 20+ regional domains with " +
            "rating, keyword, and media filters.",
        description: "Scrapes Amazon product reviews across 20+ regional " +
            "domains with advanced filtering. Returns review text, " +
            "star ratings, verified-purchase flags, reviewer " +
            "metadata, timestamps, review media (images/videos), " +
            "variant association, helpful/vote counts, language " +
            "tags, and aspect-level sentiment summaries. Supports " +
            "filtering by rating, keywords, media-only, verified " +
            "purchases, and an expanded collection mode across star " +
            "ratings. Suited for market research and SEO.",
        docsUrl: "https://apify.com/web_wanderer/amazon-reviews-extractor",
        categories: ["amazon"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/web_wanderer/amazon-reviews-extractor",
    request: {
        method: "POST",
        path: "/v2/acts/web_wanderer~amazon-reviews-extractor/runs",
    },
    input: {
        schema: {
            // `limit` is the primary limiting knob (page cap) — WE require
            // it at the binding (inner int/min(1)/max(50) kept by
            // .required, zod 4): the estimate must be deducible to price
            // the hold (D25)
            body: zAmazonReviewsExtractorBody.required({ limit: true }),
        },
    },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids are OUR snake_case keys; `vendor` carries the
            // actor's charge-event name verbatim when it differs — the
            // broker card row key and the join key for the stashed
            // run-record rates (design D19)
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    vendor: "apify-actor-start",
                    // survey-pinned GOLD-tier event price
                    consumes: { credit: "default", amount: 0.00002 },
                },
                review: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "reviews",
                    consumes: { credit: "default", amount: 0.0007 },
                },
            },
        },
        /** limit review-PAGES (~10 reviews each, v1 LIMIT_IS_PAGES) ×
         *  products — limit is required at the binding; products is
         *  actor-required, and an empty batch estimates 0, which is
         *  correct (D25). */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "review": body.limit * 10 * body.products.length,
                },
            };
        },
    },
});
