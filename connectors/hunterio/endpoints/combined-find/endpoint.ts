import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zCombinedFindQueryParams } from "./schema/inputs.ts";

/** GET /combined/find — person + company profiles from one email. */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Person and Company",
        summary:
            "Look up a person's profile and their company's profile from one email address.",
        description: "One call, both profiles: resolve an email address " +
            "into the person (name, location, employment, social " +
            "handles) AND their company (industry codes, size, " +
            "headquarters, tech stack, funding) — the union of the " +
            "/people/find and /companies/find responses, at the same " +
            "price as either single call. An unknown address answers 404 " +
            "and costs nothing. Suited for qualifying an inbound email in " +
            "one hop.",
        docsUrl: "https://hunter.io/api-documentation/v2#combined-enrichment",
        categories: ["people-enrichment"],
        notes: [
            "A miss (404) costs nothing, and neither does a partial profile: " +
            "Hunter charges only when every core data point is returned.",
        ],
    },
    request: { method: "GET", path: "/combined/find" },
    input: { schema: { queryParams: zCombinedFindQueryParams } },
    usage: {
        /** 0.2 credit flat — not 0.2 + 0.2 — "charged only when the response
         *  returns all core data points from either the company data set or
         *  the email data set"
         *  (help.hunter.io/en/articles/1970956-hunter-api, 2026-09-17). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "profiles",
            description:
                "responses whose person or company profile carries every core data point (otherwise zero)",
            consumes: { credit: "default", amount: 0.2 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => {
            const filled = (value: unknown) =>
                Array.isArray(value)
                    ? value.length > 0
                    : value !== undefined && value !== null && value !== "";
            const person = [
                utils.json.optionalGet(data.output, "$.data.person.email"),
                utils.json.optionalGet(
                    data.output,
                    "$.data.person.name.fullName",
                ),
                utils.json.optionalGet(
                    data.output,
                    "$.data.person.employment.title",
                ),
            ].every(filled);
            const category = utils.json.optionalGet(
                data.output,
                "$.data.company.category",
            );
            const company = [
                [utils.json.optionalGet(data.output, "$.data.company.name")],
                [
                    ...(typeof category === "object" && category !== null
                        ? Object.values(category)
                        : []),
                    utils.json.optionalGet(
                        data.output,
                        "$.data.company.description",
                    ),
                    utils.json.optionalGet(data.output, "$.data.company.tags"),
                ],
                [
                    utils.json.optionalGet(
                        data.output,
                        "$.data.company.location",
                    ),
                    utils.json.optionalGet(
                        data.output,
                        "$.data.company.geo.countryCode",
                    ),
                ],
                [
                    utils.json.optionalGet(
                        data.output,
                        "$.data.company.metrics.employees",
                    ),
                    utils.json.optionalGet(
                        data.output,
                        "$.data.company.metrics.employeesCount",
                    ),
                ],
            ].every((alternatives) => alternatives.some(filled));
            return { counts: { RESULT: (person || company) ? 1 : 0 } };
        },
    },
});
