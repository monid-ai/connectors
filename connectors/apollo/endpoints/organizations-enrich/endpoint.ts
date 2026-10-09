import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zOrganizationEnrichQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Apollo Organization Enrichment",
        summary:
            "Enrich one company by domain, LinkedIn URL, or website with firmographics, funding, and technology data.",
        description: "Resolve a company into a complete firmographic " +
            "profile: industry, employee count, revenue, funding history, " +
            "technology stack, locations, corporate phone, social " +
            "profiles, description, and the parent / subsidiary hierarchy " +
            "(owned_by_organization, owned_by_chain, " +
            "ultimate_parent_organization, suborganizations). Identify the " +
            "company by domain, LinkedIn URL, or website; add name to " +
            "improve the match. Best for qualifying inbound leads, " +
            "enriching CRM accounts, and pre-outreach company research.",
        docsUrl: "https://docs.apollo.io/reference/organization-enrichment",
        categories: ["company-enrichment"],
        // The identifier rule is NOT here: it survives into the compiled
        // input schema as an `anyOf` (clay D13).
        notes: ["An unmatched company draws nothing."],
    },
    request: { method: "GET", path: "/organizations/enrich" },
    // Apollo's own rule (organization-enrichment reference, 2026-09-16):
    // "use domain, linkedin_url, or website to identify the company; name
    // alone is not supported" — bound as a union so it survives
    // compilation as `anyOf` (clay D13); `name` is a modifier on every arm.
    input: {
        schema: {
            queryParams: z.union([
                zOrganizationEnrichQueryParams.required({ domain: true }),
                zOrganizationEnrichQueryParams.required({ linkedin_url: true }),
                zOrganizationEnrichQueryParams.required({ website: true }),
            ]).describe(
                "Provide at least one of domain, linkedin_url, or website; " +
                    "name alone is not supported.",
            ),
        },
    },
    usage: {
        /** 1 credit per organization — https://docs.apollo.io/docs/api-pricing
         *  (2026-09-16); an unmatched company draws nothing (design D4). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "matched companies",
            description: "companies Apollo matched to the identifiers",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** A match is an `organization` OBJECT; a no-match is `null` (v1
         *  extractResultCount, from its drills). Stated verbatim on the
         *  complete-info lookup too, so both intern to one fnTable entry. */
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
