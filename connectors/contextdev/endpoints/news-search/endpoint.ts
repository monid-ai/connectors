import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zNewsSearchBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Search Company News",
        summary:
            "Search live and historical company news by name, domain, ticker, or ISIN.",
        description: "Find news coverage about one company, identified by " +
            "name, website domain, stock ticker (optionally scoped to an " +
            "exchange), or ISIN. Returns articles with stable ids, a " +
            "story_id that groups syndicated copies of one announcement, " +
            "url, headline, description, language, authors, lead image, " +
            "publish date, article type (editorial, press_release, " +
            "regulatory_filing, advisory), source publication, and a " +
            "verified entity-relevance match. Supports publisher domain and " +
            "country filters, language and article-type filters, a " +
            "published-at window, relevance or recency ordering, and " +
            "cursor pagination. Suited for company monitoring, due " +
            "diligence, deal sourcing, and news-driven enrichment.",
        docsUrl: "https://docs.context.dev/api-reference/news/search",
        categories: ["company-news"],
        notes: [
            "A company the vendor cannot resolve is a 404 at no charge; each " +
            "cursor page is its own run and bills its own articles.",
        ],
    },
    request: { method: "POST", path: "/news/search" },
    // `limit` REQUIRED at the binding (design D25): it is the estimate's
    // whole basis, so the caller states it.
    input: { schema: { body: zNewsSearchBody.required({ limit: true }) } },
    usage: {
        /** 1 credit per 10 articles — https://www.context.dev/pricing
         *  (2026-09-17, "1 / ten_results"), a BLOCK rate the vendor's own
         *  meter confirmed in v1's drills (10 → 1, 30 → 3), so `every: 10`
         *  with the fold's ceil is the vendor's arithmetic. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            every: 10,
            label: "articles",
            description: "articles returned, billed per block of ten",
            consumes: { credit: "default", amount: 1 },
        },
        estimate: ({ data }) => ({ counts: { RESULT: data.input.body.limit } }),
        evidence: ({ data, utils }) => ({
            counts: {
                RESULT: utils.json.len(data.output, "$.data"),
            },
        }),
    },
});
