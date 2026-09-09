import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookCommentsScraperBody } from "./schema/inputs.ts";

/**
 * apify/facebook-comments-scraper — List Facebook Comments. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "List Facebook Comments",
        summary: "Extract public comments and threaded replies from " +
            "Facebook posts, photos, videos, and reels.",
        description: "Extracts public comments and threaded replies (up to " +
            "three nesting levels) from Facebook posts, photos, " +
            "videos, and reels. Returns comment text, reply chains, " +
            "likes/reaction counts, timestamps, commenter profile " +
            "metadata (name, profile ID, profile picture), post " +
            "metadata, and AD-library activity flags. Supports " +
            "sorting and date-based filtering.",
        docsUrl: "https://apify.com/apify/facebook-comments-scraper",
        categories: ["facebook"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apify/facebook-comments-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apify~facebook-comments-scraper/runs",
    },
    input: {
        schema: {
            // the actor accepts an absent resultsLimit (scrapes as many
            // comments as possible; prefill 50 is editor-only, NOT a
            // server default) — WE require it (inner min(1) kept by
            // .required, zod 4) and require a non-empty startUrls batch:
            // the estimate must be deducible to price the hold (D24)
            body: zFacebookCommentsScraperBody
                .required({ "resultsLimit": true })
                .extend({
                    "startUrls": zFacebookCommentsScraperBody.shape
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
                "comment": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "comments",
                },
            },
        },
        /** resultsLimit comments per post url (v1 PER_QUERY_LIMIT) — both
         *  required at the binding, so the estimate is pure arithmetic
         *  (D24). */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "comment": body.resultsLimit * body.startUrls.length,
                },
            };
        },
    },
});
