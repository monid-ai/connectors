import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEnrichmentQueryParams } from "./schema/inputs.ts";

/** GET /v1/company/enrichment — 75+ structured fields across sections. */
export default defineEndpoint({
    meta: {
        displayName: "Akta Company Enrichment",
        summary: "Enrich a company with 75+ structured fields.",
        description: "Enrich a company with 75+ structured fields across " +
            "sections — firmographic (incl. headcount), business_model, " +
            "company_assessment, trust_signal, company_hierarchy, " +
            "digital_presence (incl. website traffic), financial_estimate, " +
            "location, management_profile (founders and leadership team), " +
            "product_offering, strategic_signal, customer_profile, " +
            "industry, and technology. Funding and investment data — " +
            "fundraising history, funding rounds, amounts raised, " +
            "investors, and valuation (funding_detail), plus mergers, " +
            "acquisitions, and investment activity (mna_and_investment) — " +
            "are Enterprise-tier sections. List the sections you want in " +
            "the 'sections' filter (required — billing is per section). " +
            "The response data is keyed by section.",
        docsUrl: "https://docs.akta.pro/api-reference/company-data",
        categories: ["company-enrichment", "funding-data"],
    },
    request: { method: "GET", path: "/v1/company/enrichment/" },
    // `sections` REQUIRED AT THE BINDING (design D24): the CREDIT estimate
    // is per-section arithmetic, so the knob must be deterministic after
    // validation. The schema file stays the faithful vendor mirror
    // (vendor-side, omitted = all sections); zod 4 `.required` keeps the
    // inner enum-array checks.
    input: {
        schema: {
            queryParams: zEnrichmentQueryParams.required({ sections: true }),
        },
    },
    usage: {
        /** The provider's model, restated so the estimate's counts key
         *  narrows to the doc's own literal metered key (design D23/D24 —
         *  consolidate stays provider-level). */
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.CREDIT },
        /** Akta enrichment bills 2.5 CREDITS PER SECTION — v1 evidence:
         *  company-enrichment.ts priced `makePerResultPrice(0.125)` per
         *  section at the fixed $0.05/credit rate (v1 common.ts
         *  DOLLARS_PER_CREDIT), i.e. $0.125 / $0.05 = 2.5 credits; its
         *  estimate held #sections × that rate ("all 16 sections = $2.00"
         *  = 40 credits). `sections` is required at this binding, so the
         *  STRICT len read cannot miss post-validation. Settle trues up
         *  on `credits_consumed`. */
        estimate: ({ data, utils }) => ({
            counts: {
                "CREDIT":
                    utils.json.len(data.input.queryParams ?? {}, "$.sections") *
                    2.5,
            },
        }),
    },
});
