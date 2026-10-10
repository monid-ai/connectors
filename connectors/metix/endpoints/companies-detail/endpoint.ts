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
            "IDs per request. A record carries the name, website and " +
            "social URLs, industry and keywords, company type, whether it " +
            "sells B2B, headcount with its year-on-year growth, size " +
            "band, LinkedIn follower count, founding year, the full " +
            "headquarters address, the last funding round amount and " +
            "date, and any stock listing. `_source` narrows the record by " +
            "field path; false returns the ID alone. An ID that resolves " +
            "to nothing is reported as not found and costs nothing. " +
            "Charged per five records found.",
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
        /** The vendor's own `preflightMaxCost`:
         *  ceil(requested_record_count / 5) — every requested ID priced
         *  as though it resolves, which is the honest worst case. The
         *  vendor counts that AFTER de-duplicating, so a caller repeating
         *  an ID is estimated high and settled low: the fold reads
         *  `found`, which counts each record once. High is the safe
         *  direction for a pre-run hold, so the count stays literal. */
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.company_ids.length },
        }),
    },
});
