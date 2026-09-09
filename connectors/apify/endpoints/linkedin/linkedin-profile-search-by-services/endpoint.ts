import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinProfileSearchByServicesBody } from "./schema/inputs.ts";

/**
 * harvestapi/linkedin-profile-search-by-services — Search LinkedIn Profiles (by Services). Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
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
    input: { schema: { body: zLinkedinProfileSearchByServicesBody } },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** maxItems caps the run — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "RESULT": body.maxItems !== undefined && body.maxItems > 0
                        ? Math.floor(body.maxItems)
                        : 3,
                },
            };
        },
    },
});
