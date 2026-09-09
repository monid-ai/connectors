import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinProfileSearchByNameBody } from "./schema/inputs.ts";

/**
 * harvestapi/linkedin-profile-search-by-name — Search LinkedIn Profiles (by Name). Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
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
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** maxItems is required ≥1 at the binding (D24), so the estimate
         *  is pure arithmetic. (Billing basis has a known open follow-up —
         *  the model is untouched here.) */
        estimate: ({ data }) => ({
            counts: {
                "RESULT": data.input.body.maxItems,
            },
        }),
    },
});
