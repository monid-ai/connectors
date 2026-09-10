import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookCommentsScraperBody } from "./schema/inputs.ts";
import { zFacebookCommentsScraperOutput } from "./schema/output.ts";

/**
 * apify/facebook-comments-scraper — List Facebook Comments. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
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
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zFacebookCommentsScraperOutput },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
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
                    consumes: { credit: "default", amount: 0.001 },
                },
                comment: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "comments",
                    consumes: { credit: "default", amount: 0.0014 },
                },
                filter_applied: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "date-filtered posts",
                    description: "surcharge per POST whose comments are " +
                        "scraped with the onlyCommentsNewerThan date " +
                        "filter (the vendor bills this add-on per post, " +
                        "not per comment)",
                    consumes: { credit: "default", amount: 0.0007 },
                },
            },
        },
        /** resultsLimit comments per post url (v1 PER_QUERY_LIMIT) —
         *  resultsLimit is required at the binding; startUrls is
         *  actor-required, and an empty batch estimates 0, which is
         *  correct (D25). The date-filter surcharge applies per POST
         *  ("Extra cost per post scraped with a date filter" — the
         *  vendor's own wording) when onlyCommentsNewerThan switches it
         *  on — promised at the startUrls count, each entry being one
         *  post (D29). */
        estimate: ({ data }) => {
            const body = data.input.body;
            const posts = body.startUrls.length;
            return {
                counts: {
                    comment: body.resultsLimit * posts,
                    ...(body.onlyCommentsNewerThan !== undefined && posts > 0
                        ? { filter_applied: posts }
                        : {}),
                },
            };
        },
        /** OVERRIDES the provider evidence (≥2 metered lines): dataset
         *  items ARE the comments; filter_applied is per POST, so when
         *  the onlyCommentsNewerThan input was set it counts the
         *  DISTINCT parent posts (each item's `facebookUrl` — the
         *  actor's published dataset schema) the delivered comments
         *  belong to. */
        evidence: ({ data, utils }) => {
            const items = Array.isArray(data.output) ? data.output : [];
            const dated = utils.json.optionalGet(
                data.input.body ?? {},
                "$.onlyCommentsNewerThan",
            ) !== undefined;
            const seen = Object.create(null);
            let posts = 0;
            for (const item of items) {
                const url = utils.json.optionalGet(item, "$.facebookUrl");
                if (typeof url === "string" && seen[url] !== true) {
                    seen[url] = true;
                    posts += 1;
                }
            }
            return {
                counts: {
                    comment: items.length,
                    ...(dated ? { filter_applied: posts } : {}),
                },
            };
        },
    },
});
