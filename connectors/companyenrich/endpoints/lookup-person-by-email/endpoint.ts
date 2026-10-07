import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLookupPersonQuery, zPersonLookupRequest } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Look Up a Person by Email",
        summary:
            "Resolve a known email address to a matching professional profile.",
        description:
            "Resolve an email domain to a company, then match the local part to a person. Returns the best deterministic person match with employment context, or 404 when no match is found. This resolves a known email; it does not find a new work email for a person. Costs 5 credits per successful call; expand=education adds 1 credit. Use companyenrich#people/search to discover people from role and employer criteria.",
        docsUrl: "https://docs.companyenrich.com/reference/post_people-lookup",
        categories: ["people-enrichment"],
    },
    request: { method: "POST", path: "/people/lookup" },
    input: {
        schema: {
            body: zPersonLookupRequest,
            queryParams: zLookupPersonQuery,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                call: {
                    kind: UsageModelKind.PER_CALL,
                    consumes: { credit: "default", amount: 5 },
                    label: "successful lookup",
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
                education: data.input.queryParams.expand?.includes("education")
                    ? 1
                    : 0,
            },
        }),
        evidence: ({ data }) => {
            const expansion = data.input.queryParams?.expand;
            return {
                counts: {
                    education: Array.isArray(expansion) &&
                            expansion.includes("education")
                        ? 1
                        : 0,
                },
            };
        },
    },
});
