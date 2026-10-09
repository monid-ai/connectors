import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zEmailCountQueryParams } from "./schema/inputs.ts";

/** GET /email-count — how many addresses Hunter has for a domain (free). */
export default defineEndpoint({
    meta: {
        displayName: "Count Domain Emails",
        summary:
            "Count the email addresses known for a domain, split by type, department, and seniority.",
        description: "Free lookup of how many email addresses are indexed " +
            "for one domain or company. Returns the total plus the " +
            "personal/generic split, per-department counts (executive, " +
            "it, finance, sales, marketing, and 14 more), and " +
            "per-seniority counts (junior/senior/executive). Suited for " +
            "sizing a target account before running the paid domain " +
            "search, and for quickly checking whether a domain is worth " +
            "prospecting at all. To retrieve the addresses themselves, " +
            "pass the same domain to /domain-search.",
        docsUrl: "https://hunter.io/api-documentation/v2#email-count",
        categories: ["people-enrichment"],
    },
    request: { method: "GET", path: "/email-count" },
    input: {
        schema: {
            queryParams: z.union([
                zEmailCountQueryParams.required({ domain: true }),
                zEmailCountQueryParams.required({ company: true }),
            ]).describe(
                "Provide at least one of domain or company (domain wins " +
                    "when both are given).",
            ),
        },
    },
    /** Free — v1's drill measured 0 credits (design D3). */
    usage: { model: { kind: UsageModelKind.FREE } },
});
