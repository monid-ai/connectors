import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zJobsPipeCompanyLookupPathParams } from "./schema/inputs.ts";

/**
 * `GET /v1/companies/{key}` — the enriched record of one company, one flat
 * credit per call. The quantities fns are compiler-synthesized (flat
 * model — nothing to count); no meter in the body, so the provider's
 * consolidate claims nothing and the derived flat 1 settles.
 */
export default defineEndpoint({
    meta: {
        displayName: "Look Up Company",
        summary: "The enriched record of one company, by domain, URL, email " +
            "or name.",
        description: "Returns the enriched record for a single company: " +
            "name, domain, website, logo, headcount (exact or the lower " +
            "bound of its size band), headquarters location, description, " +
            "LinkedIn page, founding year and the intelligence block " +
            "(revenue estimate, identifiers, industry). The key may be a " +
            "domain (stripe.com), a careers URL, an email address or a " +
            "company name; a domain is matched on its registrable form, " +
            "so a careers subdomain resolves to its root company. " +
            "Companies appear here once they have been resolved from a " +
            "job posting, so an employer that has never posted a job is a " +
            "404. Pair it with jobspipe#v1/jobs/search (company_domain on " +
            "each posting) to go from a hiring signal to the account " +
            "record, or with jobspipe#v1/stack/scan for what the company's " +
            "own site runs. One credit per call.",
        docsUrl: "https://docs.jobspipe.dev/api-reference/companies",
        categories: ["company-enrichment"],
        notes: [
            "A name match that is not confident enough to return is a " +
            "404, the same as no match — zero usage either way.",
        ],
    },
    request: { method: "GET", path: "/v1/companies/{key}" },
    input: { schema: { pathParams: zJobsPipeCompanyLookupPathParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 1 },
            label: "lookup",
            description: "one credit per call",
        },
    },
});
