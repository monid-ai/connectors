import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstagramHashtagScraperBody } from "./schema/inputs.ts";

/**
 * apify/instagram-hashtag-scraper — Track Instagram Hashtag. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Track Instagram Hashtag",
        summary: "Scrape Instagram posts and reels by hashtag or keyword " +
            "with engagement metrics.",
        description: "Scrapes Instagram posts and reels by hashtag or " +
            "keyword. Returns engagement metrics (likes, comments, " +
            "reshares, video views/plays), captions, timestamps, " +
            "location data, creator identity, tagged users, " +
            "mentions, carousel child items, music/audio " +
            "attribution, image/video URLs, and related hashtag " +
            "discovery. Supports both hashtag and keyword-based " +
            "discovery modes.",
        docsUrl: "https://apify.com/apify/instagram-hashtag-scraper",
        categories: ["instagram"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apify/instagram-hashtag-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apify~instagram-hashtag-scraper/runs",
    },
    input: {
        schema: {
            // resultsLimit is the PRIMARY limiting knob (the actor accepts
            // an absent resultsLimit = unbounded; live schema has prefill
            // 20 only — an editor hint, NOT a server default) — WE require
            // it: the estimate must be deducible to price the hold
            // (D24/D25). hashtags (the per-hashtag multiplier) stays the
            // plain actor-required mirror — an empty list is a genuine
            // zero-item promise.
            body: zInstagramHashtagScraperBody.required({
                resultsLimit: true,
            }),
        },
    },
    usage: {
        // SURVEY-corrected: v1 priced this PER_CALL, but the actor's
        // published charge event is per item — metered, not flat.
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            // vendor charge event: "result"
            // survey-pinned GOLD-tier event price
            consumes: { credit: "default", amount: 0.0019 },
        },
        /** resultsLimit (required at the binding) caps EACH hashtag
         *  (actor docs: 7 hashtags × limit 5 = 35 posts) — × the
         *  actor-required hashtags list: pure arithmetic (D24). */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "RESULT": body.resultsLimit * body.hashtags.length,
                },
            };
        },
    },
});
