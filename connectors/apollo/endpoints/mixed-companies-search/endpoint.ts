import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zOrganizationSearchQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Apollo Organization Search",
        summary:
            "Find companies by headcount, location, revenue, funding, keywords, and technology.",
        description: "Search Apollo's database of 30M+ companies to " +
            "discover and qualify target accounts: filter by headcount, " +
            "headquarters location, revenue, funding, name, keywords, and " +
            "technologies in use. Returns core company facts with the " +
            "Apollo organization id for each match, which Organization " +
            "Enrichment or Get Complete Organization Info turn into the " +
            "full record. Best for building account lists, market sizing, " +
            "and finding lookalike companies.",
        docsUrl: "https://docs.apollo.io/reference/organization-search",
        categories: ["company-enrichment"],
        notes: [
            "Displays at most 50,000 records per search: 100 per page, 500 " +
            "pages. Add filters to narrow the search.",
        ],
    },
    request: { method: "POST", path: "/mixed_companies/search" },
    input: { schema: { queryParams: zOrganizationSearchQueryParams } },
    usage: {
        /** 1 credit per page — https://docs.apollo.io/docs/api-pricing
         *  (2026-09-16). One request IS one page; a page with no
         *  organization draws nothing (design D4). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.PAGE,
            label: "pages",
            description: "search pages that returned at least one company",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { PAGE: 1 } }),
        evidence: ({ data, utils }) => ({
            counts: {
                PAGE: (utils.json.optionalLen(data.output, "$.organizations") ??
                        0) > 0
                    ? 1
                    : 0,
            },
        }),
    },
});
