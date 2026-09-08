import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinCompanyEmployeesBody } from "./schema/inputs.ts";

/**
 * harvestapi/linkedin-company-employees — List LinkedIn Company Employees. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "List LinkedIn Company Employees",
        summary: "Extract employee profiles from LinkedIn companies with " +
            "title, seniority, and location filters.",
        description: "Extracts employee profiles from LinkedIn companies at " +
            "scale with configurable filters for location, job " +
            "title, seniority level, functional area, industry, and " +
            "years at company \u2014 no cookies or account required. " +
            "Returns profile summaries, headlines, current and " +
            "historical work experience, education history, skills, " +
            "endorsements, recommendations, connection metrics, " +
            "certifications, and optionally discovers contact emails " +
            "with SMTP validation. Supports three scraping modes " +
            "(basic, full profile, full with email discovery).",
        docsUrl: "https://apify.com/harvestapi/linkedin-company-employees",
        categories: ["linkedin", "people-enrichment"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/harvestapi~linkedin-company-employees/runs",
    },
    input: { schema: { body: zLinkedinCompanyEmployeesBody } },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids = the actor's charge-event names, VERBATIM
            // (live survey) — the broker card row key and the join key for
            // the stashed run-record rates (design D19)
            components: {
                "actor-start": { kind: UsageModelKind.PER_CALL },
                "full-profile": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                },
            },
        },
        /** maxItems caps the run — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        estimate: presets.estimate.limitIsExact(["maxItems"], 3),
    },
});
