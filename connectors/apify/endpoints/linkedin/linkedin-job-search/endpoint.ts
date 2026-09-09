import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
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
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/harvestapi/linkedin-job-search",
    request: {
        method: "POST",
        path: "/v2/acts/harvestapi~linkedin-job-search/runs",
    },
    input: {
        schema: {
            // the actor accepts an absent maxItems (prefill 10 is
            // editor-only, NOT a server default) and reads a non-positive
            // limit as "no limit" — WE require maxItems ≥ 1 (the PRIMARY
            // limiting knob): the estimate must be deducible to price the
            // hold (D24). locations stays the plain mirror optionality
            // (multiplier array — an absent array is honestly 0 in the
            // estimate, D25).
            body: zLinkedinJobSearchBody.extend({
                maxItems: zLinkedinJobSearchBody.shape.maxItems
                    .unwrap().min(1),
            }),
        },
    },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids = the actor's charge-event names, VERBATIM
            // (live survey) — the broker card row key and the join key for
            // the stashed run-record rates (design D19)
            components: {
                "actor-start": {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                },
                "job": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "jobs",
                },
            },
        },
        /** maxItems (required ≥1 at the binding) per location — locations
         *  is honestly optional, so an absent array promises 0 (D25). */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "job": body.maxItems * (body.locations?.length ?? 0),
                },
            };
        },
    },
});
