import { z } from "zod";
import { zCompany, zSection } from "../../../schema/common.ts";

/** Akta /v1/company/enrichment query params (ported from v1). */
export const zEnrichmentQueryParams = z.object({
    company: zCompany,
    sections: z.array(zSection).optional().describe(
        "Sections to return (comma-separated query param). If omitted, all " +
            "available sections are returned. Available: firmographic, " +
            "business_model, company_assessment, trust_signal, " +
            "company_hierarchy, digital_presence, financial_estimate, " +
            "location, management_profile, product_offering, " +
            "strategic_signal, customer_profile, industry, technology. " +
            "funding_detail and mna_and_investment are Enterprise-tier.",
    ),
}).strict();
