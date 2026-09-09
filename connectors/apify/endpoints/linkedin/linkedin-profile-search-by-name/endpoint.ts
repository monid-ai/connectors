import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinProfileSearchByNameBody } from "./schema/inputs.ts";

/**
 * harvestapi/linkedin-profile-search-by-name — Search LinkedIn Profiles (by Name). Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search LinkedIn Profiles (by Name)",
        summary: "Search LinkedIn profiles by first and last name with " +
            "company, school, and location filters.",
        description: "Searches LinkedIn profiles by first and last name with " +
            "filters for location, current company, previous " +
            "company, school, and industry \u2014 no cookies or account " +
            "required. Returns profile metadata and headlines in " +
            "short mode, or full profile details (work history, " +
            "education, skills, certifications, projects, " +
            "recommendations, connection/follower counts) in full " +
            "mode. Optionally discovers contact email addresses.",
        docsUrl: "https://apify.com/harvestapi/linkedin-profile-search-by-name",
        categories: ["linkedin", "people-enrichment"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/harvestapi/linkedin-profile-search-by-name",
    request: {
        method: "POST",
        path: "/v2/acts/harvestapi~linkedin-profile-search-by-name/runs",
    },
    input: {
        schema: {
            // the actor accepts an absent maxItems (scrapes unbounded; no
            // server default published) — WE require it ≥1: the estimate
            // must be deducible to price the hold (D24). maxItems is the
            // PRIMARY bound (v1 DUAL_LIMIT probes it first, and it maps
            // 1:1 onto the billed RESULT); maxPages stays optional and no
            // longer feeds the estimate.
            body: zLinkedinProfileSearchByNameBody.extend({
                maxItems: zLinkedinProfileSearchByNameBody.shape.maxItems
                    .unwrap().min(1),
            }),
        },
    },
    usage: {
        /** MODE-SELECTED rate card (design D26), mirroring the sibling
         *  linkedin-profile-search: search pages are charged in every
         *  mode, and each returned profile bills at the rate its
         *  profileScraperMode selects ("Short" → main-profile). This
         *  replaces v1's flat worst-case $0.01/result hold — the known
         *  open follow-up on this doc's billing basis. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                search_page: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "search pages",
                    vendor: "search-page",
                    description: "search pages scraped (charged in every mode)",
                    // survey-pinned GOLD-tier event price
                    consumes: { credit: "default", amount: 0.003 },
                },
                main_profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "short profiles",
                    vendor: "main-profile",
                    description: "profiles returned in 'Short' mode",
                    consumes: { credit: "default", amount: 0.0015 },
                },
                full_profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "full profiles",
                    vendor: "full-profile",
                    description: "profiles enriched in 'Full' mode",
                    consumes: { credit: "default", amount: 0.003 },
                },
                full_profile_with_email: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "profiles with email",
                    vendor: "full-profile-with-email",
                    description:
                        "profiles enriched in 'Full + email search' mode",
                    consumes: { credit: "default", amount: 0.01 },
                },
            },
        },
        /** maxItems is required ≥1 at the binding (D24), so both quanta
         *  are pure arithmetic: pages = ceil(maxItems/25) (the harvestapi
         *  family's documented 25 profiles per page) and profiles =
         *  maxItems under the MODE-selected key. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const profileKey = body.profileScraperMode === "Full"
                ? "full_profile"
                : body.profileScraperMode === "Full + email search"
                ? "full_profile_with_email"
                : "main_profile";
            return {
                counts: {
                    "search_page": Math.ceil(body.maxItems / 25),
                    [profileKey]: body.maxItems,
                },
            };
        },
        /** OVERRIDES the provider evidence (≥2 metered components):
         *  dataset items ARE the profiles, keyed by the mode the pinned
         *  input selects. The actor does not report a page receipt in its
         *  output, so pages settle on the same documented-25-per-page
         *  arithmetic the estimate uses, over DELIVERED profiles. */
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
                : "main_profile";
            return {
                counts: {
                    "search_page": Math.ceil(profiles / 25),
                    ...(profiles > 0 ? { [profileKey]: profiles } : {}),
                },
            };
        },
    },
});
