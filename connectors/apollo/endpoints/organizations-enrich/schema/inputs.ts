import { z } from "zod";

/** GET /organizations/enrich query params — the vendor mirror
 *  (docs.apollo.io/reference/organization-enrichment, 2026-09-16). Apollo
 *  marks nothing required; the binding in endpoint.ts adds the "domain,
 *  linkedin_url, or website" rule as a union. */
export const zOrganizationEnrichQueryParams = z.object({
    domain: z.string().min(1).describe(
        "Company domain (no www. or @), e.g. 'apollo.io'.",
    ).optional(),
    linkedin_url: z.string().regex(/^https?:\/\/\S+$/).describe(
        "Company LinkedIn page URL.",
    ).optional(),
    name: z.string().min(1).describe(
        "Company name — improves match accuracy alongside domain, " +
            "linkedin_url, or website; not supported on its own.",
    ).optional(),
    website: z.string().regex(/^https?:\/\/\S+$/).describe(
        "Full company website URL.",
    ).optional(),
}).strict();
