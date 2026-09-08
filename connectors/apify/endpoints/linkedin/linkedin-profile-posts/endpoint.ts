import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
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
    request: {
        method: "POST",
        path: "/v2/acts/harvestapi~linkedin-profile-posts/runs",
    },
    input: { schema: { body: zLinkedinProfilePostsBody } },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            components: [
                { kind: UsageModelKind.PER_CALL },
                { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
            ],
        },
        /** maxPosts (schema default 10) per target url — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        estimate: presets.estimate.perQueryLimit(
            ["maxPosts"],
            ["targetUrls"],
            10,
        ),
    },
});
