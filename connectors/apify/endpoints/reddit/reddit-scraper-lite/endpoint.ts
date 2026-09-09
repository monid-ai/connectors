import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zRedditScraperLiteBody } from "./schema/inputs.ts";

/**
 * trudax/reddit-scraper-lite — Pull Reddit Posts. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pull Reddit Posts",
        summary: "Scrape Reddit posts, comments, communities, and user " +
            "profiles without login.",
        description: "Scrapes Reddit posts, comments, communities, and user " +
            "profiles without login. Returns post and comment " +
            "content with metadata, community information, and user " +
            "data. Supports limiting by number of posts or items " +
            "with results exported in multiple formats.",
        docsUrl: "https://apify.com/trudax/reddit-scraper-lite",
        categories: ["reddit"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/trudax/reddit-scraper-lite",
    request: {
        method: "POST",
        path: "/v2/acts/trudax~reddit-scraper-lite/runs",
    },
    input: {
        schema: {
            // maxItems is the PRIMARY limiting knob — required at the
            // binding (even though the actor publishes a default): the
            // estimate must be deducible to price the hold (D24/D25)
            body: zRedditScraperLiteBody.required({ maxItems: true }),
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
                "actor-start-gb": {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                },
                "result": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "results",
                },
            },
        },
        /** maxItems caps the run exactly (v1 LIMIT_IS_EXACT) — required
         *  at the binding, so the estimate is pure arithmetic, no
         *  fallbacks (D24). */
        estimate: ({ data }) => ({
            counts: { "result": data.input.body.maxItems },
        }),
    },
});
