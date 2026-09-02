import { defineEndpoint } from "@shared/core";
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
});
