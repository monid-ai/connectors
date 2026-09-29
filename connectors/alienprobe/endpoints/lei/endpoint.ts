import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zAlienprobeLeiQueryParams } from "./schema/inputs.ts";

/** GET /v1/lookup/lei — one GLEIF record by exact LEI, $0.005 per answer. */
export default defineEndpoint({
    meta: {
        displayName: "Alien Probe LEI Lookup",
        summary: "Verify a company by exact LEI — legal name, " +
            "jurisdiction, entity and registration status from GLEIF.",
        description: "Resolve one 20-character LEI to its GLEIF Level 1 " +
            "record: legal name, jurisdiction, entity status and " +
            "registration status (kept apart) and last update, with the " +
            "snapshot's vintage, coverage and sha256. The LEI is matched " +
            "exactly after a free ISO 7064 check-digit screen; a bad " +
            "check digit or a miss is refused free. The cheapest door " +
            "when you already hold an LEI — to resolve a name or domain " +
            "use `alienprobe#who`, for a firmographic profile use " +
            "`alienprobe#company`.",
        docsUrl: "https://lookups.alienprobe.ai/openapi.json",
        categories: ["company-enrichment"],
        notes: ["$0.005 per answer (5000 USDC base units on Base)."],
    },
    request: { method: "GET", path: "/lei" },
    input: { schema: { queryParams: zAlienprobeLeiQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "lei answer",
            // x-payment-info price.amount "0.005" USD; 402 accepts[0].amount
            // "5000" (USDC, 6 decimals) — read live 2026-09-29
            consumes: { credit: "default", amount: 0.005 },
        },
    },
});
