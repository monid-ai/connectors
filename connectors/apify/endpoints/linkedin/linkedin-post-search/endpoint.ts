import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinPostSearchBody } from "./schema/inputs.ts";

/**
 * harvestapi/linkedin-post-search — Search LinkedIn Posts. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search LinkedIn Posts",
        summary: "Search LinkedIn posts by text query with author and " +
            "company filters.",
        description: "Searches LinkedIn posts by text queries with optional " +
            "author/company filters \u2014 no cookies or account " +
            "required. Returns full post content, author " +
            "information, timestamps, engagement metrics (likes, " +
            "reactions, comments, shares, reaction-type breakdowns), " +
            "media (images, videos, links), and repost content. " +
            "Supports Boolean search, time-range and " +
            "sort-by-date/relevance options, and optional nested " +
            "reactions and comments per post.",
        docsUrl: "https://apify.com/harvestapi/linkedin-post-search",
        categories: ["linkedin"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/harvestapi/linkedin-post-search",
    request: {
        method: "POST",
        path: "/v2/acts/harvestapi~linkedin-post-search/runs",
    },
    input: {
        schema: {
            // the actor accepts an absent maxPosts (prefill 20 is
            // editor-only, NOT a server default) and reads 0 as "scrape ALL
            // posts" — WE require maxPosts ≥ 1 (the PRIMARY limiting knob):
            // the estimate must be deducible to price the hold (D24).
            // searchQueries stays the plain mirror optionality (multiplier
            // array — an absent array is honestly 0 in the estimate, D25).
            // The gated add-on knobs the estimate reads get the actor's
            // OWN verified published defaults at the binding (D25): the
            // three profile scraper modes default "short" (published
            // input schema; its enumTitles read "Short (no charge for
            // profile details)" / "Main - scrape profile details ..."),
            // scrapeReactions/scrapeComments default false (the actor's
            // README: "Default is `false`"), maxReactions/maxComments
            // default 10 (input descriptions: "Default is 10").
            body: zLinkedinPostSearchBody.extend({
                maxPosts: zLinkedinPostSearchBody.shape.maxPosts
                    .unwrap().min(1),
                profileScraperMode: zLinkedinPostSearchBody.shape
                    .profileScraperMode.unwrap().default("short"),
                scrapeReactions: zLinkedinPostSearchBody.shape
                    .scrapeReactions.unwrap().default(false),
                maxReactions: zLinkedinPostSearchBody.shape.maxReactions
                    .unwrap().default(10),
                reactionsProfileScraperMode: zLinkedinPostSearchBody.shape
                    .reactionsProfileScraperMode.unwrap().default("short"),
                scrapeComments: zLinkedinPostSearchBody.shape
                    .scrapeComments.unwrap().default(false),
                maxComments: zLinkedinPostSearchBody.shape.maxComments
                    .unwrap().default(10),
                commentsProfileScraperMode: zLinkedinPostSearchBody.shape
                    .commentsProfileScraperMode.unwrap().default("short"),
            }),
        },
    },
    usage: {
        /** The WHOLE published card (design D29 — an input-gated line
         *  the model omits makes estimates silently wrong the moment
         *  that input is used): base fee + posts, plus the
         *  MODE-SELECTED profile enrichment lines (the three
         *  *ProfileScraperMode inputs — "short" is free, "main" bills
         *  main_profile per enriched profile), the reaction/comment
         *  lines the scrapeReactions/scrapeComments inputs switch on,
         *  and the response-dependent no-result line. full_profile is
         *  on the published card but NO live input value selects it
         *  (the mode enums stop at "main") — modeled for coverage,
         *  never promised. Ids normalize from the actor's event names
         *  (D28); Business-tier rates, survey-pinned. */
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
                main_profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "main profiles",
                    description: "post/reaction/comment authors enriched " +
                        "with main profile details (without complete " +
                        "profile sections) when a *ProfileScraperMode " +
                        "input selects 'main'",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.0015 },
                },
                full_profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "full profiles",
                    description: "posts enriched with full profile " +
                        "details (complete profile sections) — published " +
                        "on the card, but no live input value selects it",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.0032 },
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
                    label: "no-result queries",
                    description: "search queries scraped that return no " +
                        "results",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.001 },
                },
            },
        },
        /** maxPosts (required ≥1 at the binding) per search query —
         *  searchQueries is honestly optional, so an absent array promises
         *  0 (D25). Gated lines are PROMISED when their input switches
         *  them on: reactions/comments at their per-post caps
         *  (maxReactions/maxComments carry the actor's published default
         *  10 at the binding); main_profile sums one per post when
         *  profileScraperMode is 'main', plus per capped reaction/comment
         *  when THEIR mode input is 'main'. full_profile has no live
         *  gating input — never promised. no_result is
         *  response-dependent — promised at the D24 floor 0, so holds
         *  acknowledge the line. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const posts = body.maxPosts *
                (body.searchQueries?.length ?? 0);
            const reactions = body.scrapeReactions
                ? body.maxReactions * posts
                : 0;
            const comments = body.scrapeComments ? body.maxComments * posts : 0;
            const enriching = body.profileScraperMode === "main" ||
                (body.scrapeReactions &&
                    body.reactionsProfileScraperMode === "main") ||
                (body.scrapeComments &&
                    body.commentsProfileScraperMode === "main");
            const mainProfiles =
                (body.profileScraperMode === "main" ? posts : 0) +
                (body.reactionsProfileScraperMode === "main" ? reactions : 0) +
                (body.commentsProfileScraperMode === "main" ? comments : 0);
            return {
                counts: {
                    post: posts,
                    no_result: 0,
                    ...(body.scrapeReactions ? { reaction: reactions } : {}),
                    ...(body.scrapeComments ? { comment: comments } : {}),
                    ...(enriching ? { main_profile: mainProfiles } : {}),
                },
            };
        },
        /** OVERRIDES the provider evidence (≥2 metered lines): reaction
         *  and comment results land as SEPARATE dataset items tagged by
         *  their `type` field (the actor's published sample output —
         *  posts carry type "post"); everything unattributed counts as
         *  the base post line. Profile enrichment nests into item
         *  authors and no-result queries leave no dataset item, so
         *  main_profile/full_profile/no_result stay ABSENT here — the
         *  D27 vendor claim is the credits truth regardless. */
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
