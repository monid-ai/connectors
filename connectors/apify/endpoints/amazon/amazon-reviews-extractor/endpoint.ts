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
            // the actor requires `products` but accepts an empty batch (a
            // no-op run) — WE require it non-empty: it is the estimate's
            // multiplier, which must be deducible to price the hold (D24)
            body: zAmazonReviewsExtractorBody.extend({
                "products": zAmazonReviewsExtractorBody.shape.products
                    .min(1),
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
                "review": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "reviews",
                },
            },
        },
        /** limit review-PAGES (~10 reviews each, v1 LIMIT_IS_PAGES) ×
         *  products — limit carries the actor's server default (20) and
         *  products is non-empty at the binding, so the estimate is pure
         *  arithmetic (D24). */
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
