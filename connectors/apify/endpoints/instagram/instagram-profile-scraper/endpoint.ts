import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstagramProfileScraperBody } from "./schema/inputs.ts";
import { zInstagramProfileScraperOutput } from "./schema/output.ts";

/**
 * apify/instagram-profile-scraper — Get Instagram Profile. Pure data; the
 * async machinery is inherited leaf-wise from the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Instagram Profile",
        summary:
            "Extract public Instagram profile metadata and recent media by username, ID, or URL.",
        description:
            "Extracts public Instagram profile metadata and recent media " +
            "for one or more accounts by username, ID, or URL. Returns " +
            "bio, profile pictures, contact links, business category, " +
            "verification status, audience metrics (followers, following, " +
            "post/video/highlight totals), join date, related accounts, " +
            "and detailed recent media items with captions, hashtags, " +
            "mentions, media URLs, engagement metrics, and tagged users. " +
            "One result per account. Runs asynchronously.",
        docsUrl: "https://apify.com/apify/instagram-profile-scraper",
        categories: ["instagram"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apify/instagram-profile-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apify~instagram-profile-scraper/runs",
    },
    input: {
        schema: {
            // usernames is the whole billed quantity (one profile each) —
            // the plain actor-required mirror; an empty list is a genuine
            // zero-item promise, not an error (D24/D25).
            // includeAboutSection is the gating knob for the about-account
            // add-on the estimate reads — binding default = the actor's
            // VERIFIED published default (false, D25).
            body: zInstagramProfileScraperBody.extend({
                includeAboutSection: zInstagramProfileScraperBody.shape
                    .includeAboutSection.unwrap().default(false),
            }),
        },
    },
    // Published dataset-item schema (design D29): passthrough
    // DOCUMENTATION — non-strict, all-optional ("required" stripped), so
    // catalogs and agents see the output shape while vendor drift can
    // never fail a paid run; the drift suite reports field changes.
    output: { schema: zInstagramProfileScraperOutput },
    usage: {
        /** The WHOLE published card (design D29 — an input-gated line
         *  the model omits makes estimates silently wrong the moment
         *  that input is used): base profiles plus the about-account
         *  ADD-ON the includeAboutSection input switches on. Ids
         *  normalize from the actor's event names (D28); Business-tier
         *  rates, survey-pinned. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "profiles",
                    // survey-pinned Business-tier event price
                    consumes: { credit: "default", amount: 0.0016 },
                },
                about_account: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "about-account profiles",
                    description: "surcharge per profile scraped with " +
                        "account information (date joined, country) when " +
                        "includeAboutSection is on",
                    consumes: { credit: "default", amount: 0.004 },
                },
            },
        },
        /** one profile per username (v1 ONE_PER_QUERY) — the
         *  actor-required list: pure arithmetic (D24). The about-account
         *  surcharge applies per PROFILE when includeAboutSection (pinned
         *  false at the binding) switches it on — promised at the same
         *  profile count. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const profiles = body.usernames.length;
            return {
                counts: {
                    profile: profiles,
                    ...(body.includeAboutSection
                        ? { about_account: profiles }
                        : {}),
                },
            };
        },
        /** OVERRIDES the provider evidence (≥2 metered lines): dataset
         *  items ARE the profiles; about_account counts them too when the
         *  includeAboutSection toggle was on (the add-on applies to every
         *  profile of the run). */
        evidence: ({ data, utils }) => {
            const profiles = Array.isArray(data.output)
                ? data.output.length
                : 0;
            const about = utils.json.optionalGet(
                data.input.body ?? {},
                "$.includeAboutSection",
            ) === true;
            return {
                counts: {
                    profile: profiles,
                    ...(about ? { about_account: profiles } : {}),
                },
            };
        },
    },
});
