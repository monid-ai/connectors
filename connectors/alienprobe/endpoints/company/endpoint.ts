import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zAlienprobeCompanyQueryParams } from "./schema/inputs.ts";

/** GET /v1/lookup/company — one legal-entity profile, $0.04 per answer. */
export default defineEndpoint({
    meta: {
        displayName: "Alien Probe Company Profile",
        summary: "Profile one company by domain, name, CIK, ticker or " +
            "LEI — 22 fields, each with its source and as-of date.",
        description: "Resolve one company to a single legal entity and " +
            "return its profile: legal name, LEI, CIK, EIN, tickers, " +
            "exchanges, SIC code and description, entity type, state of " +
            "incorporation, jurisdiction, legal and HQ address, business " +
            "phone, fiscal year end, website, domain, latest annual " +
            "revenue (10-K/20-F), employees, founded, entity status and " +
            "last filing date — 22 fields, EACH as {value, source, as_of} " +
            "(source = GLEIF, SEC or Wikidata) and null when no source " +
            "states it, never filled by inference. Joined from the GLEIF " +
            "golden copy (Level 1), SEC EDGAR and Wikidata into one " +
            "digest-pinned snapshot (~3.5M entities; the answer carries " +
            "its snapshot_sha256). Look up by domain (apple.com), legal " +
            "name, CIK, ticker or LEI. A name or shared domain matching " +
            "several companies is refused free with up to 5 candidates " +
            "— query again with kind=lei or kind=cik. For LEI " +
            "registration facts only, `alienprobe#lei` is cheaper; to " +
            "verify an entity by name or domain against GLEIF with the " +
            "match rule stated, use `alienprobe#who`.",
        docsUrl: "https://lookups.alienprobe.ai/openapi.json",
        categories: ["company-enrichment"],
        notes: [
            "$0.04 per answer (40000 USDC base units on Base).",
            "The domain index covers only companies Wikidata links to an " +
            "official website (~22.6k), so many private companies resolve " +
            "by name or LEI but not by domain.",
            "Revenue is the latest annual 10-K or 20-F fact; SEC-derived " +
            "fields are null for non-filers.",
        ],
    },
    request: { method: "GET", path: "/company" },
    input: { schema: { queryParams: zAlienprobeCompanyQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "company answer",
            // x-payment-info price.amount "0.04" USD; 402 accepts[0].amount
            // "40000" (USDC, 6 decimals) — read live 2026-09-29
            consumes: { credit: "default", amount: 0.04 },
        },
    },
});
