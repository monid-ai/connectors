import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import {
    zJobPostingsPathParams,
    zJobPostingsQueryParams,
} from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Apollo Organization Job Postings",
        summary:
            "List a company's active job postings by its Apollo organization id.",
        description: "List the jobs a company is actively hiring for — " +
            "title, location, posting URL, and dates — by its Apollo " +
            "organization id (from Organization Search). Hiring activity " +
            "is a strong growth and buying signal; best for signal-based " +
            "prospecting, competitive intelligence, and timing outreach to " +
            "expanding teams.",
        docsUrl: "https://docs.apollo.io/reference/organization-jobs-postings",
        categories: ["jobs"],
        notes: ["Displays at most 10,000 postings per company."],
    },
    /** PUBLIC identity (design D1): the native path carries an
     *  `{organization_id}` placeholder, which an endpoint identity cannot —
     *  pinned to Apollo's own name for the endpoint, the API-key scope
     *  `api/v1/organizations/job_postings` (v1 id:
     *  `/organizations/{organization_id}/job_postings`). */
    endpoint: "/organizations/job_postings",
    request: {
        method: "GET",
        path: "/organizations/{organization_id}/job_postings",
    },
    input: {
        schema: {
            pathParams: zJobPostingsPathParams,
            queryParams: zJobPostingsQueryParams,
        },
    },
    usage: {
        /** 1 credit per page — https://docs.apollo.io/docs/api-pricing
         *  (2026-09-16). One request IS one page; a page with no posting
         *  draws nothing (design D4). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.PAGE,
            label: "pages",
            description: "pages that returned at least one job posting",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { PAGE: 1 } }),
        evidence: ({ data, utils }) => ({
            counts: {
                PAGE: (utils.json.optionalLen(
                        data.output,
                        "$.organization_job_postings",
                    ) ?? 0) > 0
                    ? 1
                    : 0,
            },
        }),
    },
});
