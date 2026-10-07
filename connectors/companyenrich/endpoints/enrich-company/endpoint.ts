import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEnrichCompanyQuery } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Enrich a Company",
        summary: "Return a company profile from its domain.",
        description:
            "Enrich a known company domain with firmographics, location, funding, technologies and social profiles. Fields vary by company. Costs 1 credit per successful call; expand=workforce adds 5 credits. With waitForEnrichment=false, an unstored domain returns 404 without charging credits and schedules enrichment for a later lookup. Use companyenrich#companies/search when you have criteria rather than a known domain.",
        docsUrl:
            "https://docs.companyenrich.com/reference/get_companies-enrich",
        categories: ["company-enrichment"],
    },
    request: { method: "GET", path: "/companies/enrich" },
    input: {
        schema: {
            queryParams: zEnrichCompanyQuery,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                call: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 1 },
                    label: "successful lookup",
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
                workforce: data.input.queryParams.expand?.includes("workforce")
                    ? 1
                    : 0,
            },
        }),
        evidence: ({ data }) => {
            const expansion = data.input.queryParams?.expand;
            return {
                counts: {
                    workforce: Array.isArray(expansion) &&
                            expansion.includes("workforce")
                        ? 1
                        : 0,
                },
            };
        },
    },
});
