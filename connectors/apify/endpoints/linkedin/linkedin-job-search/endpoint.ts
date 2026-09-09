import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinJobSearchBody } from "./schema/inputs.ts";

/**
 * harvestapi/linkedin-job-search — Search LinkedIn Jobs. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search LinkedIn Jobs",
        summary: "Scrape LinkedIn job listings by title with " +
            "multi-location and multi-company queries.",
        description: "Scrapes LinkedIn job listings at scale by job title " +
            "with multi-location and multi-company queries \u2014 no " +
            "cookies or account required. Returns job titles, " +
            "plain-text and HTML descriptions, locations, posting " +
            "dates, salary/benefits/employment type, application " +
            "links, company metadata (names, logos, employee counts, " +
            "industries), and job metrics (applicant and view " +
            "counts). Supports filters for workplace type, " +
            "experience level, salary ranges, posting date, industry " +
            "codes, and easy-apply flag.",
        docsUrl: "https://apify.com/harvestapi/linkedin-job-search",
        categories: ["linkedin", "jobs"],
    },
    request: {
        method: "POST",
        path: "/v2/acts/harvestapi~linkedin-job-search/runs",
    },
    input: { schema: { body: zLinkedinJobSearchBody } },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids = the actor's charge-event names, VERBATIM
            // (live survey) — the broker card row key and the join key for
            // the stashed run-record rates (design D19)
            components: {
                "actor-start": { kind: UsageModelKind.PER_CALL },
                "job": { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
            },
        },
        /** maxItems per location — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        estimate: presets.estimate.perQueryLimit(
            "maxItems",
            "locations",
            3,
        ),
    },
});
