import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinCompanyEmployeesBody } from "./schema/inputs.ts";

/**
 * harvestapi/linkedin-company-employees — List LinkedIn Company Employees. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
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
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/harvestapi/linkedin-company-employees",
    request: {
        method: "POST",
        path: "/v2/acts/harvestapi~linkedin-company-employees/runs",
    },
    input: {
        schema: {
            // the actor accepts an absent maxItems (scrapes unbounded; live
            // schema has prefill 25 only — an editor hint, NOT a server
            // default) — WE require it, and require it POSITIVE (this
            // vendor reads a non-positive limit as "no limit"): the
            // estimate must be deducible to price the hold (D24)
            body: zLinkedinCompanyEmployeesBody.extend({
                maxItems: zLinkedinCompanyEmployeesBody.shape.maxItems
                    .unwrap().min(1),
            }),
        },
    },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids are OUR snake_case row keys; `vendor` carries
            // the actor's charge-event name verbatim when it differs
            // (design D19/D26)
            components: {
                actor_start: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    vendor: "actor-start",
                    // survey-pinned GOLD-tier event price
                    consumes: { credit: "default", amount: 0.015 },
                },
                full_profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "full profiles",
                    vendor: "full-profile",
                    consumes: { credit: "default", amount: 0.004 },
                },
            },
        },
        /** maxItems caps the run exactly (v1 LIMIT_IS_EXACT) — required ≥1
         *  at the binding, so the estimate is pure arithmetic (D24). */
        estimate: ({ data }) => ({
            counts: {
                "full_profile": data.input.body.maxItems,
            },
        }),
    },
});
