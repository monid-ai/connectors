import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCompaniesFindQueryParams } from "./schema/inputs.ts";

/** GET /companies/find — a company profile from its domain. */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Company",
        summary:
            "Look up a company's full profile — industry, size, location, tech stack — from its domain.",
        description: "Resolve a domain into a company profile. Returns " +
            "name and legal name, description, category (sector, " +
            "industry, GICS/SIC/NAICS codes), tags, founding year, " +
            "headquarters geo, phone, site emails, logo, social handles " +
            "(LinkedIn, Twitter, Crunchbase, Instagram), employee range " +
            "and traffic rank metrics, detected technologies with " +
            "categories, funding rounds, and parent-company pointers, in " +
            "the Clearbit-compatible camelCase shape. An unknown domain " +
            "answers 404 and costs nothing. Suited for firmographic " +
            "enrichment, account qualification, and tech-stack research.",
        docsUrl: "https://hunter.io/api-documentation/v2#company-enrichment",
        categories: ["company-enrichment"],
        notes: [
            "A miss (404) costs nothing, and neither does a partial profile: " +
            "Hunter charges only when every core data point is returned.",
        ],
    },
    request: { method: "GET", path: "/companies/find" },
    input: { schema: { queryParams: zCompaniesFindQueryParams } },
    usage: {
        /** 0.2 credit, "charged if all of the following data points are
         *  returned": company name; category, description or tags; location
         *  or country code; company size
         *  (help.hunter.io/en/articles/1970956-hunter-api, 2026-09-17).
         *  A partial profile is a free 200; a 404 miss is error-as-data. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "profiles",
            description:
                "profiles returned with name, category / description / tags, location, and size (a partial profile counts zero)",
            consumes: { credit: "default", amount: 0.2 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => {
            const filled = (value: unknown) =>
                Array.isArray(value)
                    ? value.length > 0
                    : value !== undefined && value !== null && value !== "";
            const category = utils.json.optionalGet(
                data.output,
                "$.data.category",
            );
            const company = [
                [utils.json.optionalGet(data.output, "$.data.name")],
                [
                    ...(typeof category === "object" && category !== null
                        ? Object.values(category)
                        : []),
                    utils.json.optionalGet(data.output, "$.data.description"),
                    utils.json.optionalGet(data.output, "$.data.tags"),
                ],
                [
                    utils.json.optionalGet(data.output, "$.data.location"),
                    utils.json.optionalGet(
                        data.output,
                        "$.data.geo.countryCode",
                    ),
                ],
                [
                    utils.json.optionalGet(
                        data.output,
                        "$.data.metrics.employees",
                    ),
                    utils.json.optionalGet(
                        data.output,
                        "$.data.metrics.employeesCount",
                    ),
                ],
            ].every((alternatives) => alternatives.some(filled));
            return { counts: { RESULT: company ? 1 : 0 } };
        },
    },
});
