import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zOrganizationShowPathParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Apollo Get Complete Organization Info",
        summary:
            "Get the complete record for a company by Apollo organization id.",
        description: "Direct lookup of everything Apollo knows about one " +
            "company by its Apollo organization id (from Organization " +
            "Search): full firmographics, revenue, funding events, " +
            "technology stack, locations, social profiles, and " +
            "description. Use Organization Enrichment instead when you only " +
            "have the company's domain, LinkedIn URL, or website.",
        docsUrl:
            "https://docs.apollo.io/reference/get-complete-organization-info",
        categories: ["company-enrichment"],
    },
    /** PUBLIC identity (design D1): the native path carries an `{id}`
     *  placeholder, which an endpoint identity cannot — pinned to Apollo's
     *  own name for the endpoint, the API-key scope
     *  `api/v1/organizations/show` (v1 id: `/organizations/{id}`). */
    endpoint: "/organizations/show",
    request: { method: "GET", path: "/organizations/{id}" },
    input: { schema: { pathParams: zOrganizationShowPathParams } },
    usage: {
        /** 1 credit per company — https://docs.apollo.io/docs/api-pricing
         *  (2026-09-16). An unknown id is a 422, never an empty 200. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "companies",
            description: "company records returned",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => {
            const record = utils.json.optionalGet(
                data.output,
                "$.organization",
            );
            return {
                counts: {
                    RESULT: record !== null && record !== undefined &&
                            typeof record === "object" && !Array.isArray(record)
                        ? 1
                        : 0,
                },
            };
        },
    },
});
