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
            "record carries the title, seniority and function, the hiring " +
            "company with its firmographics, location and remote posture, " +
            "posting and closing dates, employment type, salary where " +
            "published, and the description. `_source` narrows the record " +
            "by field path; false returns the ID alone. An ID that " +
            "resolves to nothing is reported as not found and costs " +
            "nothing. Charged per five records found.",
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
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.job_ids.length },
        }),
    },
});
