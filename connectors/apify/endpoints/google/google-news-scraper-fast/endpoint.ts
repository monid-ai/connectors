import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
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
        /** maxArticles × (keywords + topics) — TWO multiplier arrays, so
         *  an inline fn (D19 addendum). The schema is the source of truth:
         *  typed body access, no probing. */
        estimate: ({ data }) => {
            const body = data.input.body;
            if (body.maxArticles === undefined) {
                return { counts: { "RESULT": 3 } };
            }
            const queries = (body.keywords?.length ?? 0) +
                (body.topics?.length ?? 0);
            return {
                counts: {
                    "RESULT": body.maxArticles * Math.max(queries, 1),
                },
            };
        },
    },
});
