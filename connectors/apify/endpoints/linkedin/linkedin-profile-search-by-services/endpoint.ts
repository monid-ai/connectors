import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinProfileSearchByServicesBody } from "./schema/inputs.ts";

/**
 * harvestapi/linkedin-profile-search-by-services — Search LinkedIn Profiles (by Services). Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search LinkedIn Profiles (by Services)",
        summary: "Search LinkedIn profiles by service keywords and " +
            "geography.",
        description: "Searches LinkedIn profiles by service keywords and " +
            "geographic filters \u2014 no cookies or account required. " +
            "Returns profile metadata, headline, summary, current " +
            "and past work experience, education history, location, " +
            "skills, endorsements, recommendations, " +
            "connections/follower counts, certifications, projects, " +
            "and optionally discovered email addresses. Supports " +
            "three scraper modes: search-results-only, full profile, " +
            "and full profile with email discovery.",
        docsUrl:
            "https://apify.com/harvestapi/linkedin-profile-search-by-services",
        categories: ["linkedin", "people-enrichment"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/harvestapi/linkedin-profile-search-by-services",
    request: {
        method: "POST",
        path: "/v2/acts/harvestapi~linkedin-profile-search-by-services/runs",
    },
    input: {
        schema: {
            // the actor accepts an absent maxItems (scrapes unbounded;
            // prefill 20 is editor-only, NOT a server default) — WE require
            // it ≥1: the estimate must be deducible to price the hold (D24)
            body: zLinkedinProfileSearchByServicesBody.extend({
                maxItems: zLinkedinProfileSearchByServicesBody.shape.maxItems
                    .unwrap().min(1),
            }),
        },
    },
    usage: {
        /** MODE-SELECTED rate card (design D26): this actor's card has no
         *  page event — each returned profile bills at the rate its
         *  profileScraperMode selects. This replaces v1's flat worst-case
         *  $0.01/result hold — the known open follow-up on this doc's
         *  billing basis. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                short_profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "short profiles",
                    description: "profiles returned in 'Short' mode",
                    // survey-pinned GOLD-tier event price
                    consumes: { credit: "default", amount: 0.001 },
                },
                full_profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "full profiles",
                    description: "profiles enriched in 'Full' mode",
                    consumes: { credit: "default", amount: 0.0032 },
                },
                full_profile_with_email: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "profiles with email",
                    description:
                        "profiles enriched in 'Full + email search' mode",
                    consumes: { credit: "default", amount: 0.01 },
                },
            },
        },
        /** maxItems caps the run exactly (v1 LIMIT_IS_EXACT) — required ≥1
         *  at the binding, so the estimate is pure arithmetic (D24),
         *  keyed by the mode the pinned input selects. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const profileKey = body.profileScraperMode === "Full"
                ? "full_profile"
                : body.profileScraperMode === "Full + email search"
                ? "full_profile_with_email"
                : "short_profile";
            return { counts: { [profileKey]: body.maxItems } };
        },
        /** OVERRIDES the provider evidence (≥2 metered components):
         *  dataset items ARE the profiles, keyed by mode. */
        evidence: ({ data, utils }) => {
            const profiles = Array.isArray(data.output)
                ? data.output.length
                : 0;
            const mode = utils.json.optionalGet(
                data.input.body ?? null,
                "$.profileScraperMode",
            );
            const profileKey = mode === "Full"
                ? "full_profile"
                : mode === "Full + email search"
                ? "full_profile_with_email"
                : "short_profile";
            return { counts: { [profileKey]: profiles } };
        },
    },
});
