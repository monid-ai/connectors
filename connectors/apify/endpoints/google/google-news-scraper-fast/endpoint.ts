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
    input: {
        schema: {
            // the actor reads maxArticles 0 as "no limit" (unbounded) —
            // WE forbid it, keeping the actor's server default (100):
            // the estimate must be deducible to price the hold (D24)
            body: zGoogleNewsScraperFastBody.extend({
                "maxArticles": zGoogleNewsScraperFastBody.shape.maxArticles
                    .unwrap().min(1).default(100),
            }),
        },
    },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** maxArticles × (keywords + topics + topicUrls) — the cap applies
         *  per keyword/topic/section (v1 PER_QUERY_LIMIT; the old sum
         *  missed topicUrls). All three query arrays carry the actor's
         *  server default ([]), so the estimate is pure arithmetic (D24). */
        estimate: ({ data }) => {
            const body = data.input.body;
            const queries = body.keywords.length + body.topics.length +
                body.topicUrls.length;
            return {
                counts: {
                    "RESULT": body.maxArticles * queries,
                },
            };
        },
    },
});
