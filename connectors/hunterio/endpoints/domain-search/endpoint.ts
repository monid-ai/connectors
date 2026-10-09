import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zDomainSearchBody } from "./schema/inputs.ts";

/** POST /domain-search — every email address published for one domain. */
export default defineEndpoint({
    meta: {
        displayName: "Find Domain Emails",
        summary:
            "List all email addresses found for a domain, with sources and confidence scores.",
        description: "Search every email address published on the web " +
            "for one company domain. Returns each address with type " +
            "(personal/generic), confidence score, up to 20 source URLs, " +
            "first/last name, job title, seniority, department, " +
            "decision-maker flag, LinkedIn and Twitter handles, phone " +
            "number, and verification status, plus the domain's email " +
            "pattern (e.g. {first}) and organization name. Supports " +
            "filtering by type, seniority, department, decision maker, " +
            "job titles, verification status, required fields, and " +
            "location include/exclude; paginate with limit/offset " +
            "(meta.results is the total). Suited for building outreach " +
            "lists, mapping a company's team, and finding the right " +
            "contact at a target account. To verify an address before " +
            "sending, pass it to /email-verifier.",
        docsUrl: "https://hunter.io/api-documentation/v2#domain-search",
        categories: ["people-enrichment"],
        notes: [
            "One credit covers up to 10 returned email addresses (a " +
            "100-address page draws 10 credits); zero results draw nothing.",
        ],
    },
    // a POST with the JSON body v1 drill-verified: the documented GET
    // silently ignores the nested `location` filter (design D5)
    request: { method: "POST", path: "/domain-search" },
    input: {
        schema: {
            // `limit` REQUIRED at the binding (design D25): it is the
            // estimate's whole basis (vendor default 10), so the caller
            // states it. "At least one of domain or company" is the
            // vendor's rule, bound as a union (clay D13).
            body: z.union([
                zDomainSearchBody.required({ domain: true, limit: true }),
                zDomainSearchBody.required({ company: true, limit: true }),
            ]).describe(
                "Provide at least one of domain or company (domain wins " +
                    "when both are given).",
            ),
        },
    },
    usage: {
        /** 1 credit per started block of 10 returned addresses — v1's
         *  2026-08-20 ledger drill (10→1, 25→3, 85→9, 100→10); the block
         *  IS `every` and the engine folds `ceil(n / 10)` (design D3). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "email addresses",
            description:
                "email addresses returned, billed per started block of ten",
            every: 10,
            consumes: { credit: "default", amount: 1 },
        },
        /** The requested page's worst case: `limit` addresses (typed read
         *  of the validated input — design D25). */
        estimate: ({ data }) => ({
            counts: { RESULT: data.input.body.limit },
        }),
        /** What came back: `data.emails[]` (v1 countDomainSearchEmails). */
        evidence: ({ data, utils }) => ({
            counts: {
                RESULT: utils.json.optionalLen(data.output, "$.data.emails") ??
                    0,
            },
        }),
    },
});
