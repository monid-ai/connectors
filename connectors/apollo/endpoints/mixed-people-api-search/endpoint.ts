import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zPeopleSearchQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Apollo People Search",
        summary:
            "Find people by title, seniority, location, employer, and technology.",
        description: "Search Apollo's database of 230M+ people to build " +
            "prospect and lead lists: filter by job title, seniority, " +
            "location, employer, company size, revenue, and technologies " +
            "used. Returns matching people as previews (obfuscated last " +
            "name, no email or phone) with the Apollo person id, which " +
            "People Enrichment or Get Complete Person Info turn into a full " +
            "record. Best for lead generation, recruiting, market mapping, " +
            "and finding decision makers at target accounts.",
        docsUrl: "https://docs.apollo.io/reference/people-api-search",
        categories: ["people-enrichment"],
        notes: [
            "Displays at most 50,000 records per search: 100 per page, 500 " +
            "pages. Add filters to narrow the search.",
        ],
    },
    request: { method: "POST", path: "/mixed_people/api_search" },
    input: { schema: { queryParams: zPeopleSearchQueryParams } },
    /** 0 credits — https://docs.apollo.io/docs/api-pricing (2026-09-16):
     *  searching consumes no Apollo credits. Estimate/evidence are
     *  compiler-synthesized. */
    usage: { model: { kind: UsageModelKind.FREE } },
});
