import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
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
    request: {
        method: "POST",
        path: "/v2/acts/apify~facebook-comments-scraper/runs",
    },
    input: { schema: { body: zFacebookCommentsScraperBody } },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids = the actor's charge-event names, VERBATIM
            // (live survey) — the broker card row key and the join key for
            // the stashed run-record rates (design D19)
            components: {
                "actor-start": { kind: UsageModelKind.PER_CALL },
                "comment": { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
            },
        },
        /** resultsLimit comments per post url — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        estimate: presets.estimate.perQueryLimit(["resultsLimit"], [
            "startUrls",
        ], 3),
    },
});
