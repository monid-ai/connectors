import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zMetixCompaniesDetailBody } from "./schema/inputs.ts";

/** POST /entity/v1/companies/detail-by-id — read company records for IDs
 *  a search returned, one credit per five records found. */
export default defineEndpoint({
    meta: {
        displayName: "Read Company Records",
        summary: "Turn company IDs from a search into full firmographics.",
        description: "Read full company records for encrypted string " +
            "company IDs returned by metix#v1/companies/query, up to 100 " +
            "IDs per request. A record carries the name and domain, " +
            "industry, headcount and size band, company type, " +
            "headquarters location and founding year. `_source` narrows " +
            "the record by field path; false returns the ID alone. An ID " +
            "that resolves to nothing is reported as not found and costs " +
            "nothing. Charged per five records found.",
        docsUrl: "https://platform.metix.ai/docs/api/companies",
        categories: ["company-enrichment"],
    },
    request: { method: "POST", path: "/entity/v1/companies/detail-by-id" },
    // No tightening — see profiles-detail.
    input: { schema: { body: zMetixCompaniesDetailBody } },
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
            counts: { "RESULT": data.input.body.company_ids.length },
        }),
    },
});
