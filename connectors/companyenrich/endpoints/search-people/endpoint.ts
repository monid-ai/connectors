import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zPersonSearchPageInput, zSearchPeopleQuery } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Search People",
        summary:
            "Find professional profiles by employer, role, seniority and location.",
        description:
            "Search professional profiles by employer, role, seniority, department, country, education and employment dates. Returns people and work history, without email addresses or phone numbers. Set pageSize explicitly (1–100); page-based retrieval stops at 10,000 results. Costs 2 credits per returned person, with a 2-credit minimum; expand=education adds 1 credit per person. Use companyenrich#people/lookup when you already have an email to resolve.",
        docsUrl: "https://docs.companyenrich.com/reference/post_people-search",
        categories: ["people-enrichment"],
    },
    request: { method: "POST", path: "/people/search" },
    input: {
        schema: {
            body: zPersonSearchPageInput.required({ pageSize: true }),
            queryParams: zSearchPeopleQuery,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                result: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 2 },
                    label: "results (minimum one)",
                },
                education: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 1 },
                    label: "education expansion",
                },
            },
        },
        estimate: ({ data }) => ({
            counts: {
                result: data.input.body.pageSize,
                education: data.input.queryParams.expand?.includes("education")
                    ? data.input.body.pageSize
                    : 0,
            },
        }),
        evidence: ({ data, utils }) => {
            const delivered = utils.json.len(data.output, "$.items");
            const expansion = data.input.queryParams?.expand;
            return {
                counts: {
                    // Only the base line has the vendor minimum; expansions
                    // count delivered records, never totalItems or pageSize.
                    result: Math.max(1, delivered),
                    education: Array.isArray(expansion) &&
                            expansion.includes("education")
                        ? delivered
                        : 0,
                },
            };
        },
    },
});
