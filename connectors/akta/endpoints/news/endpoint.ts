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
    input: { schema: { queryParams: zNewsQueryParams } },
    usage: {
        /** The provider's model, restated so the estimate's counts key
         *  narrows to the doc's own literal metered key (design D23/D24 —
         *  consolidate stays provider-level). */
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.CREDIT },
        /** Akta news bills 0.01 CREDITS PER ARTICLE + a 0.1-credit flat
         *  part — v1 evidence: news.ts priced
         *  `makePerResultPrice(0.0005, 0.005)` ($0.0005/article + $0.005
         *  flat) at the fixed $0.05/credit rate (v1 common.ts
         *  DOLLARS_PER_CREDIT). `limit` carries the verified vendor
         *  default 10 (materialized at validation), so the STRICT num
         *  read cannot miss. Settle trues up on `credits_consumed`. */
        estimate: ({ data, utils }) => ({
            counts: {
                "CREDIT": 0.1 +
                    utils.json.num(data.input.queryParams ?? {}, "$.limit") *
                        0.01,
            },
        }),
    },
});
