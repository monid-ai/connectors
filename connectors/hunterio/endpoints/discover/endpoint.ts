import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zDiscoverBody } from "./schema/inputs.ts";

/** POST /discover — companies matching structured filters (free). */
export default defineEndpoint({
    meta: {
        displayName: "Search Companies",
        summary:
            "Search a B2B company database with structured filters like location, industry, and size.",
        description: "Free structured search over Hunter's B2B company " +
            "database. Returns up to 100 companies per page, each with " +
            "its domain, organization name, and personal/generic/total " +
            "email counts (meta.results is the full match count). " +
            "Supports filters on specific organizations, similar " +
            "companies, headquarters location (continent/region/country/" +
            "state/city include+exclude), industry, headcount ranges, " +
            "company type, founding year, keywords, technologies in use, " +
            "and funding series/amount/date; paginate with limit/offset " +
            "up to 10,000. Suited for building target account lists and " +
            "market mapping before pulling emails per company. To pull " +
            "the emails for a matched company, pass its domain to " +
            "/domain-search; for aggregate reachable-people totals, pass " +
            "the same filters to /discover/people.",
        docsUrl: "https://hunter.io/api-documentation/v2#discover",
        categories: ["company-enrichment"],
        notes: [
            "limit and offset can only be changed on a Premium plan " +
            "(upstream).",
        ],
    },
    request: { method: "POST", path: "/discover" },
    input: {
        schema: {
            // "at least one filter" — the vendor's rule, one arm per filter
            // key (clay D13; v1 `.refine(hasDiscoverFilter)`)
            body: z.union([
                zDiscoverBody.required({ organization: true }),
                zDiscoverBody.required({ similar_to: true }),
                zDiscoverBody.required({ headquarters_location: true }),
                zDiscoverBody.required({ industry: true }),
                zDiscoverBody.required({ headcount: true }),
                zDiscoverBody.required({ company_type: true }),
                zDiscoverBody.required({ year_founded: true }),
                zDiscoverBody.required({ keywords: true }),
                zDiscoverBody.required({ technology: true }),
                zDiscoverBody.required({ funding: true }),
            ]).describe(
                "Provide at least one filter (organization, similar_to, " +
                    "headquarters_location, industry, headcount, " +
                    "company_type, year_founded, keywords, technology, " +
                    "funding).",
            ),
        },
    },
    /** Free upstream, unlimited (rate limits aside) — v1's drill. */
    usage: { model: { kind: UsageModelKind.FREE } },
});
