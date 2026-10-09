import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zBrandSearchQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Search Brands",
        summary:
            "Search indexed brands by name or domain for up to 10 lightweight matches.",
        description: "Resolve a partial or ambiguous company reference " +
            "against an indexed brand catalog and get up to 10 lightweight " +
            "matches — domain and name — with name matches ranked ahead of " +
            "domain-only matches and the most popular brands first within " +
            "each group. Supports prefix autocomplete (on by default), " +
            "restricting the match to names or domains, and up to two " +
            "typos of tolerance. Suited for autocomplete, lead-form and CRM " +
            "entity resolution, and picking the right domain before a full " +
            "brand lookup.",
        docsUrl:
            "https://docs.context.dev/api-reference/brand-intelligence/search",
        categories: ["company-enrichment"],
        notes: [
            "Free on this integration's plan tier. Rate-limited like " +
            "every other endpoint.",
        ],
    },
    request: { method: "GET", path: "/brand/search" },
    input: { schema: { queryParams: zBrandSearchQueryParams } },
    /** 0 credits on the Pro plan Monid buys on —
     *  https://www.context.dev/pricing (2026-09-17, "Free on Pro and
     *  Scale"); the provider consolidate still reads the vendor meter
     *  (0 prunes to an empty claim). */
    usage: { model: { kind: UsageModelKind.FREE } },
    output: {
        /** `results[].logo` is a Logo Link URL the vendor generates for
         *  the CALLING organization — it embeds Monid's public client id
         *  and draws on Monid's separate Logo Link quota — so it never
         *  reaches a caller (v1 brandSearchFormatOutput; design D4). Runs
         *  after evidence, on the consolidated body. */
        // deep key-walk is SAFE here today: the response is
        // {results: [{domain, name, logo}]} and no other level can carry a
        // `logo` key — revisit if the vendor ever nests one elsewhere
        // (reconcile 2026-09-16; the octen deep-omit lesson).
        fromResponse: ({ data, utils }) =>
            utils.json.omit(data.output, ["logo"]),
    },
});
