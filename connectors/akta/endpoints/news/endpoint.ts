import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zNewsQueryParams } from "./schema/inputs.ts";

/** GET /v1/news — enriched, entity-resolved news signals. */
export default defineEndpoint({
    meta: {
        displayName: "Akta News",
        summary: "Enriched news for a company, topic, or industry.",
        description: "Fetch news articles for a company, an open-ended " +
            "topic (query), or an industry code, each enriched with an " +
            "AI-generated summary, event classification (e.g. equity " +
            "fundraising and funding rounds, debt financing, mergers & " +
            "acquisitions, IPOs, valuation events, C-suite and founder " +
            "appointments or departures, product launches, partnerships, " +
            "layoffs, earnings), publisher metadata, sentiment, resolved " +
            "company mentions, geography, industry tags, a named-entity " +
            "'entities' object (person, location, product, event), and the " +
            "full article text. Track a company's fundraising, investor " +
            "activity, or deal flow by filtering on type_list codes. " +
            "Filter by company, query, industry code, named entities, " +
            "standard taxonomies (naics/sic/iptc/iab code lists), date " +
            "range, score tier, type, sentiment, countries, and a " +
            "publisher blacklist. Industry codes come from the Industry " +
            "Search endpoint. List filters are comma-separated query " +
            "params.",
        docsUrl: "https://docs.akta.pro/api-reference/news-signals",
        categories: ["company-news", "news-search", "funding-data"],
    },
    request: { method: "GET", path: "/v1/news/" },
    // `limit` REQUIRED at the binding (design D25 — the mirror stays the
    // faithful vendor contract, optional there): it is the estimate's
    // whole basis, so the caller states it.
    input: {
        schema: {
            queryParams: zNewsQueryParams.required({ limit: true }),
        },
    },
    usage: {
        /** COMPOSITE (design D25): akta news bills a FLAT part + PER
         *  ARTICLE — v1 evidence: news.ts `makePerResultPrice(0.0005,
         *  0.005)` = $0.005 flat + $0.0005/article, i.e. 0.1 + 0.01
         *  credits at the fixed $0.05/credit rate. The model states the
         *  QUANTITY shape; both credit rates live in the services card
         *  keyed by these component ids. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                request: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    // 0.1 credits flat — v1 makePerResultPrice(0.0005, 0.005)
                    // at $0.05/credit
                    consumes: { credit: "default", amount: 0.1 },
                },
                article: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "articles",
                    // 0.01 credits per article (same v1 evidence)
                    consumes: { credit: "default", amount: 0.01 },
                },
            },
        },
        /** The caller-stated `limit` IS the article promise (typed read —
         *  the estimate sees the PRE-toRequest validated input, design
         *  D25); the engine appends the flat `request: 1`. */
        estimate: ({ data }) => ({
            counts: { "article": data.input.queryParams.limit },
        }),
        // Settle is INHERITED (design D27): the provider's generic
        // evidence counts articles DELIVERED (len($.data) under the sole
        // metered line) and the provider consolidate lifts the vendor's
        // credits_consumed claim out of the payload.
    },
});
