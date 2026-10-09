import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zBrandRetrieveBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Retrieve Brand",
        summary:
            "Resolve a company by domain, name, email, ticker, transaction descriptor, or page URL into a full brand profile.",
        description: "Turn a domain, company name, work email, stock " +
            "ticker, card or bank statement descriptor, or one exact page " +
            "URL into a structured brand profile: logos and symbol marks, " +
            "backdrops, brand colors, fonts, a written description and " +
            "slogan, social profiles, addresses, stock and headcount " +
            "information, important links, and industry classification " +
            "(Context.dev's EIC taxonomy, inline on every response). Built " +
            "for signup and CRM enrichment, merchant feeds, " +
            "personalization, and on-brand UI generation. The body's type " +
            "selects the lookup key; ticker_exchange disambiguates a " +
            "ticker, country_gl a name or descriptor. Cached brand data is " +
            "refreshed quarterly and maxAgeMs forces an earlier refresh; " +
            "maxSpeed trades enrichment depth for latency.",
        docsUrl:
            "https://docs.context.dev/api-reference/brand-intelligence/brand",
        categories: ["company-enrichment"],
        notes: [
            "A domain Context.dev has never crawled needs at least 10 " +
            "seconds; a deadline below that answers 422 " +
            "COLD_DOMAIN_TIMEOUT_TOO_LOW. Prefetch the domain first, then " +
            "retry.",
        ],
    },
    request: { method: "POST", path: "/brand/retrieve" },
    input: { schema: { body: zBrandRetrieveBody } },
    timeouts: { requestMs: 310_000, runMs: 310_000 },
    usage: {
        /** 10 credits per lookup — https://www.context.dev/pricing
         *  (2026-09-17), whichever key selects the brand; a cached lookup
         *  the vendor reports at 0 still settles the list rate (the claim
         *  prunes, the fold bills — v1's max(calculated, actual)). */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "brand lookups",
            consumes: { credit: "default", amount: 10 },
        },
    },
});
