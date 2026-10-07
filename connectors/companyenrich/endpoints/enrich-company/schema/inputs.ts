import { z } from "zod";

/** Vendor input mirror: https://docs.companyenrich.com/reference/get_companies-enrich
 * OpenAPI checked 2026-10-07; no connector defaults in this mirror. */

export const zEnrichCompanyQuery = z.object({
    domain: z.string().max(1024),
    expand: z.array(z.enum(["workforce"])).describe(
        "Expandable response fields. Repeat the parameter to request multiple expansions.\n\nSupported values:\n- `workforce`: costs 5 credits per company and adds the `workforce` field to `CompanyInfo`.",
    ).optional(),
    waitForEnrichment: z.boolean().describe(
        "Whether to wait for on-demand enrichment when the company is not stored yet. When false, stored company data is returned immediately; a company that is not stored yet results in a 404 without charging credits, and its enrichment is scheduled in the background so a later call can return it quickly.",
    ).optional(),
});
