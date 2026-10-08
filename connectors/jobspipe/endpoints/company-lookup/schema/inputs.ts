import { z } from "zod";

/**
 * JobsPipe `GET /v1/companies/{key}` path parameter — the faithful mirror
 * of the published OpenAPI parameter (docs.jobspipe.dev, 2026-10-07): a
 * string of 1–253 characters.
 */
export const zJobsPipeCompanyLookupPathParams = z.strictObject({
    key: z.string().min(1).max(253).describe(
        "Company domain (stripe.com), careers URL " +
            "(https://careers.walmart.com/jobs), email (andrew@stripe.com) " +
            "or company name (Stripe). A domain is matched on its " +
            "registrable form, so a careers subdomain resolves to the same " +
            "company as its root domain.",
    ),
});
