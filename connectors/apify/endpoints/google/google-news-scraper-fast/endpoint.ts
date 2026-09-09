import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleNewsScraperFastBody } from "./schema/inputs.ts";

/**
 * data_xplorer/google-news-scraper-fast — Search Google News. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
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
            // maxArticles is the primary limiting knob and the actor
            // documents "0 = no limit" (unbounded) — WE require it and
            // floor it at 1 (unwrap keeps the inner int/min(0) checks):
            // the estimate must be deducible to price the hold (D25)
            body: zGoogleNewsScraperFastBody.extend({
                maxArticles: zGoogleNewsScraperFastBody.shape.maxArticles
                    .unwrap().min(1),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            // the actor's charge-event this leaf line joins to
            vendor: "apify-default-dataset-item",
            // survey-pinned GOLD-tier event price
            consumes: { credit: "default", amount: 0.001 },
        },
        /** maxArticles × (keywords + topics + topicUrls) — the cap applies
         *  per keyword/topic/section (v1 PER_QUERY_LIMIT; the old sum
         *  missed topicUrls). maxArticles is required at the binding; the
         *  three query arrays are optional and absent ≡ empty, so an
         *  all-empty query set estimates 0, which is correct (D25). */
        estimate: ({ data }) => {
            const body = data.input.body;
            const queries = (body.keywords?.length ?? 0) +
                (body.topics?.length ?? 0) +
                (body.topicUrls?.length ?? 0);
            return {
                counts: {
                    "RESULT": body.maxArticles * queries,
                },
            };
        },
    },
});
