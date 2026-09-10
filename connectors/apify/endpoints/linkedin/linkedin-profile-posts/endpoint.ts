import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinProfilePostsBody } from "./schema/inputs.ts";

/**
 * harvestapi/linkedin-profile-posts — Pull LinkedIn Profile Posts. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
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
            // array is honestly 0 in the estimate, D25). The gated add-on
            // knobs the estimate reads get the actor's OWN verified
            // published defaults at the binding (D25): scrapeReactions /
            // scrapeComments default false (published input schema), and
            // maxReactions / maxComments default 5 (the actor's own input
            // descriptions: "Default is 5").
            body: zLinkedinProfilePostsBody.extend({
                maxPosts: zLinkedinProfilePostsBody.shape.maxPosts
                    .unwrap().min(1),
                scrapeReactions: zLinkedinProfilePostsBody.shape
                    .scrapeReactions.unwrap().default(false),
                maxReactions: zLinkedinProfilePostsBody.shape.maxReactions
                    .unwrap().default(5),
                scrapeComments: zLinkedinProfilePostsBody.shape
                    .scrapeComments.unwrap().default(false),
                maxComments: zLinkedinProfilePostsBody.shape.maxComments
                    .unwrap().default(5),
            }),
        },
    },
    usage: {
        /** The WHOLE published card (design D29 — an input-gated line
         *  the model omits makes estimates silently wrong the moment
         *  that input is used): base fee + posts, plus the reaction and
         *  comment lines the scrapeReactions/scrapeComments inputs
         *  switch on, and the response-dependent no-result line. Ids
         *  normalize from the actor's event names (D28); Business-tier
         *  rates, survey-pinned. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            // component ids are OUR snake_case keys — the actor's
            // charge-event names normalize onto them (strip apify-
            // prefix, kebab/camel → snake), which is the drift
            // guard's derived join (design D28)
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.00005 },
                },
                post: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "posts",
                    consumes: { credit: "default", amount: 0.0015 },
                },
                reaction: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "reactions",
                    description: "post reaction result, when " +
                        "scrapeReactions is on",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.0015 },
                },
                comment: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "comments",
                    description: "post comment result, when " +
                        "scrapeComments is on",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.0015 },
                },
                no_result: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "no-result pages",
                    description: "post pages scraped that turn out to " +
                        "contain no posts",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.001 },
                },
            },
        },
        /** maxPosts (required ≥1 at the binding) per target url —
         *  targetUrls is honestly optional, so an absent array promises 0
         *  (D25). Gated lines are PROMISED when their input switches
         *  them on: reactions/comments at their per-post caps
         *  (maxReactions/maxComments carry the actor's published default
         *  5 at the binding). no_result is response-dependent (which
         *  pages turn out empty is unknowable pre-run) — promised at the
         *  D24 floor 0, so holds acknowledge the line. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const posts = body.maxPosts * (body.targetUrls?.length ?? 0);
            return {
                counts: {
                    post: posts,
                    no_result: 0,
                    ...(body.scrapeReactions
                        ? { reaction: body.maxReactions * posts }
                        : {}),
                    ...(body.scrapeComments
                        ? { comment: body.maxComments * posts }
                        : {}),
                },
            };
        },
        /** OVERRIDES the provider evidence (≥2 metered lines): reaction
         *  and comment results land as SEPARATE dataset items tagged by
         *  their `type` field (the actor's published sample output —
         *  posts carry type "post"); everything unattributed counts as
         *  the base post line. no_result pages leave no dataset item to
         *  attribute, so that line stays ABSENT here — the D27 vendor
         *  claim is the credits truth regardless. */
        evidence: ({ data, utils }) => {
            const items = Array.isArray(data.output) ? data.output : [];
            let posts = 0;
            let reactions = 0;
            let comments = 0;
            for (const item of items) {
                const type = utils.json.optionalGet(item, "$.type");
                if (type === "reaction") reactions += 1;
                else if (type === "comment") comments += 1;
                else posts += 1;
            }
            return {
                counts: {
                    post: posts,
                    ...(reactions > 0 ? { reaction: reactions } : {}),
                    ...(comments > 0 ? { comment: comments } : {}),
                },
            };
        },
    },
});
