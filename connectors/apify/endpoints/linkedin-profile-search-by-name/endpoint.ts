import { defineEndpoint } from "@shared/core";
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
});
