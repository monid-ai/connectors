import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zMetixJobsDetailBody } from "./schema/inputs.ts";

/** POST /entity/v1/jobs/detail-by-id — read job postings for IDs a search
 *  returned, one credit per five records found. */
export default defineEndpoint({
    meta: {
        displayName: "Read Job Postings",
        summary: "Turn job IDs from a search into full postings.",
        description: "Read full job postings for encrypted string job IDs " +
            "returned by metix#v1/jobs/query, up to 100 IDs per request. A " +
            "record carries the title, seniority, functions and " +
            "industries, the hiring company's name and LinkedIn, the " +
            "location, the posting date and whether it is estimated, " +
            "whether the posting is still open, the applicant count, " +
            "minimum experience, employment type, the salary bounds and " +
            "period where published with their annualized form, the " +
            "description, and both the posting URL and the apply URL. " +
            "`_source` narrows the record by field path; false returns the " +
            "ID alone. An ID that resolves to nothing is reported as not " +
            "found and costs nothing. Charged per five records found.",
        docsUrl: "https://platform.metix.ai/docs/api/jobs",
        categories: ["jobs"],
    },
    request: { method: "POST", path: "/entity/v1/jobs/detail-by-id" },
    // No tightening — see profiles-detail.
    input: { schema: { body: zMetixJobsDetailBody } },
    usage: {
        /** `GET /contract`: ceil(successful_record_count / 5) off `found`,
         *  2xx with a non-empty result only. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            every: 5,
            label: "records",
            consumes: { credit: "default", amount: 1 },
        },
        /** The vendor's own `preflightMaxCost`:
         *  ceil(requested_record_count / 5) — every requested ID priced
         *  as though it resolves, which is the honest worst case. The
         *  vendor counts that AFTER de-duplicating, so a caller repeating
         *  an ID is estimated high and settled low: the fold reads
         *  `found`, which counts each record once. High is the safe
         *  direction for a pre-run hold, so the count stays literal. */
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.job_ids.length },
        }),
    },
});
