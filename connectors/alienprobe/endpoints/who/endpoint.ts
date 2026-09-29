import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zAlienprobeWhoQueryParams } from "./schema/inputs.ts";

/** GET /v1/lookup/who — one GLEIF legal entity, $0.05 per answer. */
export default defineEndpoint({
    meta: {
        displayName: "Alien Probe Who (Legal Entity)",
        summary: "Verify a company by name, domain or LEI against GLEIF " +
            "— one legal entity, with how it matched.",
        description: "Verify who a company legally is: resolve a name " +
            "(optionally `;JURISDICTION`), a registrable domain or an LEI " +
            "to exactly one GLEIF Level 1 legal entity and return its " +
            "LEI, legal name, jurisdiction, entity status and " +
            "registration status (kept apart), last update, the match " +
            "rule used (lei_exact, domain_exact, name_exact, " +
            "name_normalized), and the official website on domain " +
            "answers. Answers carry the snapshot's vintage, coverage and " +
            "sha256. It never guesses: a name matching several entities " +
            "is refused free with the candidates. For a bare LEI, " +
            "`alienprobe#lei` answers the same registration facts for " +
            "$0.005; for a firmographic profile (CIK, tickers, SIC, " +
            "revenue, addresses) use `alienprobe#company`.",
        docsUrl: "https://lookups.alienprobe.ai/openapi.json",
        categories: ["company-enrichment"],
        notes: [
            "$0.05 per answer (50000 USDC base units on Base).",
            "Domains resolve only through Wikidata LEI-to-website links, " +
            "matched exactly on the registrable domain: a subdomain misses.",
            "Records whose legal name has fewer than 2 Latin alphanumerics " +
            "(most non-Latin-script names) are absent from every door.",
        ],
    },
    request: { method: "GET", path: "/who" },
    input: { schema: { queryParams: zAlienprobeWhoQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "who answer",
            // x-payment-info price.amount "0.05" USD; 402 accepts[0].amount
            // "50000" (USDC, 6 decimals) — read live 2026-09-29
            consumes: { credit: "default", amount: 0.05 },
        },
    },
});
