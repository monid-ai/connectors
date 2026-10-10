import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zMetixJobsQueryBody } from "./schema/inputs.ts";

/** POST /v1/jobs/query — structured search over job postings, one credit
 *  per 25 job IDs returned. */
export default defineEndpoint({
    meta: {
        displayName: "Find Jobs",
        summary: "Search 90M job postings with a structured boolean query.",
        description: "Search 90M job postings with a boolean query tree " +
            "over the documented field list: title, seniority, functions, " +
            "industries, hiring company name, location, posted date, " +
            "employment type, salary bounds, minimum experience, " +
            "applicant count, whether the posting is still open, and the " +
            "description text. Composers are all, any and not; this " +
            "dataset declares no same-record scopes. Returns encrypted " +
            "string job " +
            "IDs and a `total`, never record data: read the postings with " +
            "metix#entity/v1/jobs/detail-by-id, 100 IDs at a time. `total` " +
            "is free to look at, so a filter can be narrowed before paying " +
            "to read anything. A valid query with no matches is a 200 with " +
            "an empty list and costs nothing. Charged per 25 IDs returned.",
        docsUrl: "https://platform.metix.ai/docs/api/jobs",
        categories: ["jobs"],
    },
    request: { method: "POST", path: "/v1/jobs/query" },
    // `size` REQUIRED at the binding — see people-query.
    input: { schema: { body: zMetixJobsQueryBody.required({ size: true }) } },
    usage: {
        /** `GET /contract`: ceil(successful_result_count / 25) off
         *  `job_ids`, 2xx with a non-empty result only. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            every: 25,
            label: "job IDs",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.size },
        }),
    },
});
