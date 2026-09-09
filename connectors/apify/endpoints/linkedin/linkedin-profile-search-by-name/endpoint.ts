import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
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
    request: {
        method: "POST",
        path: "/v2/acts/harvestapi~linkedin-profile-search-by-name/runs",
    },
    input: { schema: { body: zLinkedinProfileSearchByNameBody } },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** maxItems wins; else maxPages × 25 profiles/page — a dual-knob
         *  rule used ONCE, so an inline fn (the dualLimit preset is
         *  deleted — D19 addendum). */
        estimate: ({ data, utils }) => {
            const body = data.input.body ?? null;
            const items = utils.json.optionalNum(body, "$.maxItems");
            if (items !== undefined) return { counts: { "RESULT": items } };
            const pages = utils.json.optionalNum(body, "$.maxPages");
            return {
                counts: { "RESULT": pages !== undefined ? pages * 25 : 3 },
            };
        },
    },
});
