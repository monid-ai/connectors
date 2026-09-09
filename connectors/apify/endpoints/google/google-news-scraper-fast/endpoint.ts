import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
import { zGoogleNewsScraperFastBody } from "./schema/inputs.ts";

/**
 * data_xplorer/google-news-scraper-fast — Search Google News. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Google News",
        summary: "Scrape real-time Google News articles by keyword, " +
            "topic, or section across 50+ markets.",
        description: "Scrapes Google News articles in real time by keyword " +
            "search, predefined topics, or custom section URLs. " +
            "Returns article headlines, publisher names, direct " +
            "article URLs, publication timestamps, article " +
            "descriptions, and high-resolution images. Supports " +
            "parallel multi-keyword processing and region/language " +
            "targeting across 50+ markets. Suited for news " +
            "monitoring and market research.",
        docsUrl: "https://apify.com/data_xplorer/google-news-scraper-fast",
        categories: ["news-search"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/data_xplorer/google-news-scraper-fast",
    request: {
        method: "POST",
        path: "/v2/acts/data_xplorer~google-news-scraper-fast/runs",
    },
    input: { schema: { body: zGoogleNewsScraperFastBody } },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** maxArticles per keyword/topic — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        /** maxArticles × (keywords + topics) — TWO multiplier arrays, so
         *  an inline fn (presets take single fields — D19 addendum). */
        estimate: ({ data, utils }) => {
            const body = data.input.body ?? null;
            const limit = utils.json.optionalNum(body, "$.maxArticles");
            if (limit === undefined) return { counts: { "RESULT": 3 } };
            const keywords = utils.json.optionalGet(body, "$.keywords");
            const topics = utils.json.optionalGet(body, "$.topics");
            const queries = (Array.isArray(keywords) ? keywords.length : 0) +
                (Array.isArray(topics) ? topics.length : 0);
            return { counts: { "RESULT": limit * Math.max(queries, 1) } };
        },
    },
});
