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
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** maxItems caps the run exactly (v1 LIMIT_IS_EXACT) — required ≥1
         *  at the binding, so the estimate is pure arithmetic (D24).
         *  (Billing basis has a known open follow-up — the model is
         *  untouched here.) */
        estimate: ({ data }) => ({
            counts: {
                "RESULT": data.input.body.maxItems,
            },
        }),
    },
});
