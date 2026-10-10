import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zMetixCompaniesQueryBody } from "./schema/inputs.ts";

/** POST /v1/companies/query — structured search over companies, one
 *  credit per 25 company IDs returned. */
export default defineEndpoint({
    meta: {
        displayName: "Find Companies",
        summary: "Search 30M companies with a structured boolean query.",
        description: "Search 30M companies with a boolean query tree over " +
            "the documented field list: name, industry, headcount, size " +
            "band, company type, location and founding year. Composers are " +
            "all, any and not. Returns encrypted string company IDs and a " +
            "`total`, never record data: read the firmographics with " +
            "metix#entity/v1/companies/detail-by-id, 100 IDs at a time. " +
            "`total` is free to look at, so a filter can be narrowed " +
            "before paying to read anything. A valid query with no matches " +
            "is a 200 with an empty list and costs nothing. Charged per 25 " +
            "IDs returned.",
        docsUrl: "https://platform.metix.ai/docs/api/companies",
        categories: ["company-enrichment"],
    },
    request: { method: "POST", path: "/v1/companies/query" },
    // `size` REQUIRED at the binding — see people-query.
    input: {
        schema: { body: zMetixCompaniesQueryBody.required({ size: true }) },
    },
    usage: {
        /** `GET /contract`: ceil(successful_result_count / 25) off
         *  `company_ids`, 2xx with a non-empty result only. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            every: 25,
            label: "company IDs",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.size },
        }),
    },
});
