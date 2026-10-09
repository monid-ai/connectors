import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zMultiDomainSearchQueryParams } from "./schema/inputs.ts";

/** POST /multi-domain-search — masked email rows across every company
 *  matching the filters (free; the reveal is the paid step). */
export default defineEndpoint({
    meta: {
        displayName: "Search People Across Companies",
        summary:
            "Search people across every matching company; addresses stay masked until revealed.",
        description: "Free cross-company people search: one request " +
            "returns email rows across EVERY company matching the " +
            "filters, instead of one domain search per company. Each row " +
            "carries the person's abbreviated name, job title, " +
            "department, seniority, decision-maker flag, verification " +
            "status, company domain/name, and presence flags " +
            "(full_name_exists, phone_number_exists, linkedin_exists) — " +
            "the address itself stays hidden behind a reveal_handle. " +
            "Supports company filters (name, location, industry, " +
            "headcount, type, founded year, technology) and email filters " +
            "(department, seniority, type, decision maker, verification " +
            "status, min confidence); cursor pagination via search_after " +
            "over the first 10,000 rows. Suited for surveying reachable " +
            "people before paying to reveal exactly the rows you want. " +
            "To unlock the addresses, pass the reveal_handle values to " +
            "/multi-domain-search/reveal.",
        docsUrl: "https://hunter.io/api-documentation/v2#multi-domain-search",
        categories: ["people-enrichment"],
        notes: [
            "Upstream marks this endpoint Beta; the response shape may " +
            "change.",
        ],
    },
    // a POST whose filters ride the query string with NO body — the
    // documented shape; the engine sends no body when the input has none
    request: { method: "POST", path: "/multi-domain-search" },
    input: {
        schema: {
            // "at least one filter" — the vendor's rule, one arm per
            // SELECTING key (the paging knobs alone select nothing)
            queryParams: z.union([
                zMultiDomainSearchQueryParams.required({ company_name: true }),
                zMultiDomainSearchQueryParams.required({ location: true }),
                zMultiDomainSearchQueryParams.required({ industry: true }),
                zMultiDomainSearchQueryParams.required({ headcount: true }),
                zMultiDomainSearchQueryParams.required({ company_type: true }),
                zMultiDomainSearchQueryParams.required({ founded_year: true }),
                zMultiDomainSearchQueryParams.required({ technology: true }),
                zMultiDomainSearchQueryParams.required({ department: true }),
                zMultiDomainSearchQueryParams.required({ seniority: true }),
                zMultiDomainSearchQueryParams.required({ type: true }),
                zMultiDomainSearchQueryParams.required({
                    decision_maker: true,
                }),
                zMultiDomainSearchQueryParams.required({
                    verification_status: true,
                }),
                zMultiDomainSearchQueryParams.required({
                    required_field: true,
                }),
                zMultiDomainSearchQueryParams.required({
                    min_confidence: true,
                }),
            ]).describe(
                "Provide at least one company or email filter; limit, " +
                    "search_after, and per_domain alone do not select " +
                    "anything.",
            ),
        },
    },
    /** Free — "so you can survey what is available before spending any
     *  credits" (live docs) and v1's drill. */
    usage: { model: { kind: UsageModelKind.FREE } },
});
