import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFacebookGroupsScraperBody } from "./schema/inputs.ts";
import { zFacebookGroupsScraperOutput } from "./schema/output.ts";

/**
 * apify/facebook-groups-scraper — Pull Facebook Group Posts. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pull Facebook Group Posts",
        summary: "Scrape posts and comments from public Facebook groups.",
        description:
            "Scrapes posts and comments from public Facebook groups. " +
            "Returns post text and URLs, author identifiers, " +
            "timestamps, engagement metrics (likes, reactions, " +
            "shares, reaction breakdowns), top comments with " +
            "metadata, attachments and media assets (image/video " +
            "URLs, thumbnails, dimensions), and OCR-extracted text " +
            "from images. Supports sorting and filtering by " +
            "relevance, timeframe, activity, or keyword.",
        docsUrl: "https://apify.com/apify/facebook-groups-scraper",
        categories: ["facebook"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apify/facebook-groups-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apify~facebook-groups-scraper/runs",
    },
    input: {
        schema: {
            // the actor accepts an absent resultsLimit (scrapes as many
            // posts as possible; prefill 20 is editor-only, NOT a server
            // default) — WE require it at the binding (inner min(1) kept
            // by .required, zod 4): the estimate must be deducible to
            // price the hold (D25)
            body: zFacebookGroupsScraperBody.required({
                resultsLimit: true,
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zFacebookGroupsScraperOutput },
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
                post: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "posts",
                    consumes: { credit: "default", amount: 0.0026 },
                },
                filter_applied: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "date-filtered posts",
                    description: "surcharge per post scraped with the " +
                        "onlyPostsNewerThan date filter",
                    consumes: { credit: "default", amount: 0.0007 },
                },
            },
        },
        /** resultsLimit posts per group url (v1 PER_QUERY_LIMIT) —
         *  resultsLimit is required at the binding; startUrls is
         *  actor-required, and an empty batch estimates 0, which is
         *  correct (D25). The date-filter surcharge applies per POST
         *  when onlyPostsNewerThan switches it on — promised at the
         *  same post cap (D29). */
        estimate: ({ data }) => {
            const body = data.input.body;
            const posts = body.resultsLimit * body.startUrls.length;
            return {
                counts: {
                    post: posts,
                    ...(body.onlyPostsNewerThan !== undefined && posts > 0
                        ? { filter_applied: posts }
                        : {}),
                },
            };
        },
        /** OVERRIDES the provider evidence (≥2 metered lines): dataset
         *  items ARE the posts; filter_applied counts them too when the
         *  onlyPostsNewerThan date input was set (the add-on applies to
         *  every post of a date-filtered run). */
        evidence: ({ data, utils }) => {
            const posts = Array.isArray(data.output) ? data.output.length : 0;
            const dated = utils.json.optionalGet(
                data.input.body ?? {},
                "$.onlyPostsNewerThan",
            ) !== undefined;
            return {
                counts: {
                    post: posts,
                    ...(dated ? { filter_applied: posts } : {}),
                },
            };
        },
    },
});
