import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zRedditCommentScraperBody } from "./schema/inputs.ts";

/**
 * crawlerbros/reddit-comment-scraper — List Reddit Comments. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "List Reddit Comments",
        summary: "Extract full comment threads from Reddit posts with " +
            "scores, authors, and nesting.",
        description:
            "Extracts structured comment data from Reddit posts with " +
            "full thread expansion. Returns comment text, author " +
            "names, engagement metrics (score/karma, awards), " +
            "permalinks, parent-child relationships with nesting " +
            "depth, boolean flags (original poster, edited, " +
            "stickied), and creation timestamps. Automatically " +
            "expands collapsed threads and 'load more' elements to " +
            "capture complete nested comment structures.",
        docsUrl: "https://apify.com/crawlerbros/reddit-comment-scraper",
        categories: ["reddit"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/crawlerbros/reddit-comment-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/crawlerbros~reddit-comment-scraper/runs",
    },
    input: {
        schema: {
            // maxComments is the PRIMARY limiting knob — required at the
            // binding (even though the actor publishes a default): the
            // estimate must be deducible to price the hold (D24/D25).
            // postUrls (the per-post multiplier) stays the plain mirror —
            // the actor itself requires it non-empty (minItems 1).
            body: zRedditCommentScraperBody.required({ maxComments: true }),
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
                "apify-default-dataset-item": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "comments",
                },
            },
        },
        /** maxComments (required at the binding) caps EACH post — × the
         *  postUrls list (actor-required non-empty): pure arithmetic, no
         *  fallbacks (D24). The old estimate multiplied by `keywords` —
         *  wrong knob: keywords is a content FILTER, not a query
         *  multiplier; the actor scrapes per POST URL. */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "apify-default-dataset-item": body.maxComments *
                        body.postUrls.length,
                },
            };
        },
    },
});
