import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstagramPostScraperBody } from "./schema/inputs.ts";
import { zInstagramPostScraperOutput } from "./schema/output.ts";

/**
 * apify/instagram-post-scraper — Get Instagram Post. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Instagram Post",
        summary: "Extract post-level metadata from Instagram profiles and " +
            "post URLs.",
        description: "Extracts comprehensive post-level metadata from " +
            "Instagram profiles and post URLs. Returns captions, " +
            "hashtags, mentions, tagged users, media URLs (images, " +
            "carousels, reels/videos), image dimensions, alt text, " +
            "timestamps, engagement metrics (likes, comments, " +
            "replies, video views/plays), recent comment samples, " +
            "video duration, and flags for pinned, sponsored, and " +
            "paid partnership posts.",
        docsUrl: "https://apify.com/apify/instagram-post-scraper",
        categories: ["instagram"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apify/instagram-post-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apify~instagram-post-scraper/runs",
    },
    input: {
        schema: {
            // resultsLimit is the PRIMARY limiting knob (the actor accepts
            // an absent resultsLimit = unbounded; live schema has prefill
            // 20 only — an editor hint, NOT a server default) — WE require
            // it: the estimate must be deducible to price the hold
            // (D24/D25). username (the per-profile multiplier) stays the
            // plain actor-required mirror — an empty list is a genuine
            // zero-item promise. dataDetailLevel is the gating knob for
            // the post-details add-on the estimate reads — binding
            // default = the actor's VERIFIED published default
            // ("detailedData", D25; prefill "basicData" is editor-only).
            body: zInstagramPostScraperBody.required({ resultsLimit: true })
                .extend({
                    dataDetailLevel: zInstagramPostScraperBody.shape
                        .dataDetailLevel.unwrap().default("detailedData"),
                }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zInstagramPostScraperOutput },
    usage: {
        /** The WHOLE published card (design D29 — an input-gated line
         *  the model omits makes estimates silently wrong the moment
         *  that input is used): base posts plus the post-details ADD-ON
         *  ("Detailed data are paid extra" — every post ALSO bills
         *  post-details when dataDetailLevel selects detailedData; the
         *  add-on rate below the base rate marks it a surcharge, not a
         *  mode split). Ids normalize from the actor's event names
         *  (D28); Business-tier rates, survey-pinned. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                post: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "posts",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.001 },
                },
                post_details: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "detailed posts",
                    description: "surcharge per post written with detailed " +
                        "information when dataDetailLevel is detailedData",
                    consumes: { credit: "default", amount: 0.0006 },
                },
            },
        },
        /** resultsLimit (required at the binding) caps EACH profile entry
         *  (post-URL entries yield one item each, so this bounds them
         *  too) — × the actor-required username list: pure arithmetic
         *  (D24). The post-details surcharge applies per POST when
         *  dataDetailLevel (pinned "detailedData" at the binding, the
         *  actor's default) selects the detailed package — promised at
         *  the same post cap. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const posts = body.resultsLimit * body.username.length;
            return {
                counts: {
                    post: posts,
                    ...(body.dataDetailLevel === "detailedData"
                        ? { post_details: posts }
                        : {}),
                },
            };
        },
        /** OVERRIDES the provider evidence (≥2 metered lines): dataset
         *  items ARE the posts; post_details counts them too unless the
         *  run explicitly selected basicData (the actor's own default is
         *  detailedData, so an absent knob still bills the add-on). */
        evidence: ({ data, utils }) => {
            const posts = Array.isArray(data.output) ? data.output.length : 0;
            const detail = utils.json.optionalGet(
                data.input.body ?? {},
                "$.dataDetailLevel",
            );
            return {
                counts: {
                    post: posts,
                    ...(detail !== "basicData" ? { post_details: posts } : {}),
                },
            };
        },
    },
});
