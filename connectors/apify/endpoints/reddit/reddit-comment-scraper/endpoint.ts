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
    input: { schema: { body: zRedditCommentScraperBody } },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids = the actor's charge-event names, VERBATIM
            // (live survey) — the broker card row key and the join key for
            // the stashed run-record rates (design D19)
            components: {
                "apify-actor-start": { kind: UsageModelKind.PER_CALL },
                "apify-default-dataset-item": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
            },
        },
        /** maxComments per keyword — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "apify-default-dataset-item": body.maxComments !== undefined
                        ? body.maxComments *
                            Math.max(body.keywords?.length ?? 0, 1)
                        : 3,
                },
            };
        },
    },
});
