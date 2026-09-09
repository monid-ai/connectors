import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstagramApiScraperBody } from "./schema/inputs.ts";

/**
 * apify/instagram-api-scraper — Instagram API. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Instagram API",
        summary: "Scrape Instagram posts, profiles, places, and hashtags " +
            "by URL or search query, no login required.",
        description:
            "Extracts structured Instagram data from profiles, posts " +
            "(including reels and IGTV), hashtags, and locations by " +
            "direct URL or text search query, without login. Returns " +
            "page-level details, media URLs, image/video dimensions, " +
            "captions, hashtags, mentions, engagement metrics " +
            "(likes, comments), timestamps, owner metadata, top " +
            "posts, top comments with replies, and location/tag " +
            "metadata.",
        docsUrl: "https://apify.com/apify/instagram-api-scraper",
        categories: ["instagram"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apify/instagram-api-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apify~instagram-api-scraper/runs",
    },
    input: {
        schema: {
            // TWO alternative run modes bill items: direct-url runs (each
            // directUrls entry yields up to resultsLimit items) and search
            // runs (one `search` query yields up to searchLimit items).
            // The actor publishes NO server default for either limit
            // (prefills 200/1 are editor hints) and accepts absent limits
            // (unbounded) — WE require BOTH limits, the dual-mode PRIMARY
            // knobs: the estimate must be deducible to price the hold
            // (D24/D25). directUrls/search stay the plain optional mirror
            // — no active mode is a genuine zero-item promise.
            body: zInstagramApiScraperBody.required({
                resultsLimit: true,
                searchLimit: true,
            }),
        },
    },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey
            // — caught by `deno task apify:pricing` on first run)
            kind: UsageModelKind.COMPOSITE,
            // component ids = the actor's charge-event names, VERBATIM
            // (live survey) — the broker card row key and the join key for
            // the stashed run-record rates (design D19)
            components: {
                "actor-start": {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                },
                "result": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "results",
                },
            },
        },
        /** Dual-mode sum: resultsLimit × directUrls entries, plus
         *  searchLimit × one query when `search` is set. Both limits are
         *  required at the binding; an absent directUrls / search is a
         *  genuine zero-term mode (mode-presence branch = selection
         *  logic), not a masked default — pure arithmetic (D24). */
        estimate: ({ data }) => {
            const body = data.input.body;
            const urlItems = body.resultsLimit *
                (body.directUrls?.length ?? 0);
            const searchItems = body.searchLimit *
                (body.search !== undefined ? 1 : 0);
            return { counts: { "result": urlItems + searchItems } };
        },
    },
});
