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
            // server default) — WE require it at the binding (inner
            // min(1) kept by .required, zod 4): the estimate must be
            // deducible to price the hold (D25)
            body: zFacebookCommentsScraperBody.required({
                resultsLimit: true,
            }),
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
                    vendor: "actor-start",
                    // survey-pinned GOLD-tier event price
                    consumes: { credit: "default", amount: 0.001 },
                },
                comment: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "comments",
                    consumes: { credit: "default", amount: 0.0014 },
                },
            },
        },
        /** resultsLimit comments per post url (v1 PER_QUERY_LIMIT) —
         *  resultsLimit is required at the binding; startUrls is
         *  actor-required, and an empty batch estimates 0, which is
         *  correct (D25). */
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
