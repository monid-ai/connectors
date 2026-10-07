import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import {
    zCompanySearchPageInput,
    zSearchCompaniesQuery,
} from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Search Companies",
        summary:
            "Find companies using natural-language queries and structured filters.",
        description:
            "Search companies with semanticQuery or filters for industry, location, size, funding and technology. Returns enriched profiles in items with pagination metadata. Set pageSize explicitly (1–100); page-based retrieval stops at 10,000 results. Costs 1 credit per returned company, with a 1-credit minimum; expand=workforce adds 5 credits per company. Use companyenrich#companies/similar to start from seed domains instead.",
        docsUrl:
            "https://docs.companyenrich.com/reference/post_companies-search",
        categories: ["company-enrichment"],
    },
    request: { method: "POST", path: "/companies/search" },
    input: {
        schema: {
            body: zCompanySearchPageInput.required({ pageSize: true }),
            queryParams: zSearchCompaniesQuery,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                result: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 1 },
                    label: "results (minimum one)",
                },
                workforce: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 5 },
                    label: "workforce expansion",
                },
            },
        },
        estimate: ({ data }) => ({
            counts: {
                result: data.input.body.pageSize,
                workforce: data.input.queryParams.expand?.includes("workforce")
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
                    workforce: Array.isArray(expansion) &&
                            expansion.includes("workforce")
                        ? delivered
                        : 0,
                },
            };
        },
    },
});
