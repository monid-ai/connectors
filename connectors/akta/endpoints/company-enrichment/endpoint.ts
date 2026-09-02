import { defineEndpoint } from "@shared/core";
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
            "are Enterprise-tier sections. Use the 'sections' filter to " +
            "scope the response, or omit it for all sections. The response " +
            "data is keyed by section.",
        docsUrl: "https://docs.akta.pro/api-reference/company-data",
        categories: ["company-enrichment", "funding-data"],
    },
    request: { method: "GET", path: "/v1/company/enrichment" },
    input: { schema: { queryParams: zEnrichmentQueryParams } },
});
