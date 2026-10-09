import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCompanySearchQueryParams } from "./schema/inputs.ts";

/** GET /company/search — the cheap fuzzy resolver, flat per call. */
export default defineEndpoint({
    meta: {
        displayName: "Look Up Company",
        summary: "Search for a company by name, domain, LinkedIn, or " +
            "Crunchbase.",
        description: "Resolve a company from a fuzzy name, a domain, a " +
            "LinkedIn URL, or a Crunchbase URL (exactly one) into Fundable " +
            "identity fields. Returns up to ten candidates with id, name, " +
            "guru_permalink, short_description, domain, LinkedIn and " +
            "Crunchbase links, and a relevance_score. Flat price per call, " +
            "charged on zero results too. Suited as the cheap first step " +
            "before the company, company-deals, or investor-filter " +
            "endpoints that need a UUID.",
        docsUrl: "https://docs.tryfundable.ai/api-reference/companies/search",
        categories: ["funding-data", "company-enrichment"],
    },
    request: { method: "GET", path: "/company/search" },
    input: { schema: { queryParams: zCompanySearchQueryParams } },
    usage: {
        /** 0.1 credit per call, charged on zero results — the vendor's
         *  published rate card ("0.1 credit/call" on the search
         *  resolvers; everything bills the ONE Fundable credit system).
         *  The provider consolidate claims the response's own 0.1 stamp,
         *  which matches this fold exactly. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "search",
            consumes: { credit: "default", amount: 0.1 },
        },
    },
});
