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
            // NOT a server default) and reads 0 as "scrape ALL posts" — WE
            // require maxPosts ≥ 1 (the PRIMARY limiting knob): the estimate
            // must be deducible to price the hold (D24). targetUrls stays
            // the plain mirror optionality (multiplier array — an absent
            // array is honestly 0 in the estimate, D25).
            body: zLinkedinProfilePostsBody.extend({
                maxPosts: zLinkedinProfilePostsBody.shape.maxPosts
                    .unwrap().min(1),
            }),
        },
    },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids are OUR snake_case row keys; `vendor` carries
            // the actor's charge-event name verbatim when it differs
            // (design D19/D26)
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    vendor: "apify-actor-start",
                    // survey-pinned GOLD-tier event price
                    consumes: { credit: "default", amount: 0.00005 },
                },
                post: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "posts",
                    consumes: { credit: "default", amount: 0.0015 },
                },
            },
        },
        /** maxPosts (required ≥1 at the binding) per target url —
         *  targetUrls is honestly optional, so an absent array promises 0
         *  (D25). */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "post": body.maxPosts * (body.targetUrls?.length ?? 0),
                },
            };
        },
    },
});
