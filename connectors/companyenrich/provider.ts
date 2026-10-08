import { defineProvider, presets } from "@shared/core";

/** Official REST/OpenAPI references checked 2026-10-07. Consumption is
 * reported in x-credit-cost (https://docs.companyenrich.com/docs/credits).
 * Ordinary settle hooks cannot read response headers, so the documented
 * credit model settles each call; there is no body meter to consolidate. */
export default defineProvider({
    name: "companyenrich",
    meta: {
        displayName: "CompanyEnrich",
        summary:
            "Company and people enrichment, semantic search and lookalike discovery.",
        description:
            "B2B company and people data for platforms, AI agents and " +
            "go-to-market workflows. Enrich a known company by domain, find " +
            "companies using natural-language and structured filters, expand " +
            "an account list with lookalikes, search professional profiles, " +
            "or resolve a known email to a person. People search does not " +
            "return email addresses or phone numbers.",
        homepageUrl: "https://companyenrich.com",
        docsUrl: "https://docs.companyenrich.com/docs/getting-started",
        categories: ["company-enrichment", "people-enrichment"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.companyenrich.com" },
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    usage: { credits: { default: { label: "CompanyEnrich credits" } } },
});
