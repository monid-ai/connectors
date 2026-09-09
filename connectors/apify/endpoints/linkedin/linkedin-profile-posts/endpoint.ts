import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinProfilePostsBody } from "./schema/inputs.ts";

/**
 * harvestapi/linkedin-profile-posts — Pull LinkedIn Profile Posts. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pull LinkedIn Profile Posts",
        summary: "Extract posts from LinkedIn profiles and company pages " +
            "with engagement and comments.",
        description:
            "Extracts posts from LinkedIn profiles and company pages " +
            "\u2014 no cookies or account required. Returns full post " +
            "content, author metadata, timestamps, engagement " +
            "metrics, reaction-type breakdowns, nested comments with " +
            "commenter profiles, media assets (images, videos, " +
            "documents, links), repost and quote-post content, and " +
            "document pages/covers. Supports optional inclusion of " +
            "reactions and comments with per-post limits.",
        docsUrl: "https://apify.com/harvestapi/linkedin-profile-posts",
        categories: ["linkedin"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/harvestapi/linkedin-profile-posts",
    request: {
        method: "POST",
        path: "/v2/acts/harvestapi~linkedin-profile-posts/runs",
    },
    input: {
        schema: {
            // the actor accepts an absent maxPosts (prefill 5 is editor-only,
            // NOT a server default) and reads 0 as "scrape ALL posts"; it
            // also accepts absent targetUrls — WE require maxPosts ≥ 1 and
            // a non-empty targetUrls (the per-url multiplier): the estimate
            // must be deducible to price the hold (D24)
            body: zLinkedinProfilePostsBody.extend({
                "maxPosts": zLinkedinProfilePostsBody.shape.maxPosts
                    .unwrap().min(1),
                "targetUrls": zLinkedinProfilePostsBody.shape.targetUrls
                    .unwrap().min(1),
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
                "post": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "posts",
                },
            },
        },
        /** maxPosts per target url — both required at the binding, so the
         *  estimate is pure arithmetic (D24). */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "post": body.maxPosts * body.targetUrls.length,
                },
            };
        },
    },
});
