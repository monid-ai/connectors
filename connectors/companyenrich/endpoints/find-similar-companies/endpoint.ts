import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import {
    zCompanySimilarPageInput,
    zSimilarCompaniesQuery,
} from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Find Similar Companies",
        summary:
            "Discover lookalike companies from seed domains and optional filters.",
        description:
            "Find lookalike companies using 1–10 seed domains in domains, optional similarity controls and company filters. The older singular domain remains accepted but is deprecated by the vendor. Returns company profiles and similarity metadata. Set pageSize explicitly (1–100). Costs 5 credits per returned company, with a 5-credit minimum; expand=workforce adds 5 credits per company. Missing seed enrichment can return 404 when waitForEnrichment=false.",
        docsUrl:
            "https://docs.companyenrich.com/reference/post_companies-similar",
        categories: ["company-enrichment"],
    },
    request: { method: "POST", path: "/companies/similar" },
    input: {
        schema: {
            body: zCompanySimilarPageInput.required({ pageSize: true }),
            queryParams: zSimilarCompaniesQuery,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                result: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 5 },
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
