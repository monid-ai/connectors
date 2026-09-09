import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTweetScraperBody } from "./schema/inputs.ts";

/**
 * apidojo/tweet-scraper — Search Tweets on X. Pure data; the async
 * machinery is inherited leaf-wise from the apify provider. (v1's
 * catalog-visibility restriction is HOSTED policy — never doc identity.)
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Tweets on X",
        summary:
            "Scrape X (Twitter) tweets from search queries, profiles, lists, and tweet URLs at scale.",
        description:
            "Scrapes X (Twitter) tweets from search queries, profile " +
            "handles, list URLs, and tweet URLs at scale. Returns tweet " +
            "text, timestamps, tweet and profile URLs, engagement metrics, " +
            "author/profile metadata, media attachments, geolocation " +
            "information, and language tags. Supports advanced search " +
            "query syntax, combined Latest and Top search modes, and " +
            "filters for time ranges, geotargeting, language, verified " +
            "accounts, media presence, and engagement thresholds. " +
            "`maxItems` caps the total result count. Runs asynchronously.",
        docsUrl: "https://apify.com/apidojo/tweet-scraper",
        categories: ["twitter"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apidojo/tweet-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apidojo~tweet-scraper/runs",
    },
    input: {
        schema: {
            // maxItems is the PRIMARY limiting knob (the actor accepts an
            // absent maxItems = unbounded; live schema has prefill 1000
            // only — an editor hint, NOT a server default) — WE require
            // it: the estimate must be deducible to price the hold
            // (D24/D25). No extra .min(1) floor: the actor documents
            // absent = unbounded, but publishes no 0-sentinel.
            body: zTweetScraperBody.required({ maxItems: true }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            // vendor charge event: "apify-default-dataset-item"
            // survey-pinned GOLD-tier event price
            consumes: { credit: "default", amount: 0.0004 },
        },
        /** maxItems caps the run exactly (v1 LIMIT_IS_EXACT — a total run
         *  cap, not per-query) — required at the binding, so the estimate
         *  is pure arithmetic (D24). */
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.maxItems },
        }),
    },
});
