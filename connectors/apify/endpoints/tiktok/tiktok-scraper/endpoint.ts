import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTiktokScraperBody } from "./schema/inputs.ts";

/**
 * apidojo/tiktok-scraper — Pull TikTok Posts. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Pull TikTok Posts",
        summary: "Extract TikTok posts, videos, profiles, hashtags, " +
            "music, and comments at scale.",
        description: "Extracts TikTok posts, videos, profiles, hashtags, " +
            "music, locations, comments, and subtitles at scale. " +
            "Returns video metadata and media URLs, creator " +
            "profiles, engagement metrics (views, likes, shares, " +
            "comments, bookmarks), hashtag lists, audio metadata, " +
            "subtitle/caption information, and direct post links. " +
            "Supports multi-entity scraping with keyword/search " +
            "discovery, location targeting, and a built-in query " +
            "builder.",
        docsUrl: "https://apify.com/apidojo/tiktok-scraper",
        categories: ["tiktok"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apidojo/tiktok-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apidojo~tiktok-scraper/runs",
    },
    input: {
        schema: {
            // maxItems is the PRIMARY limiting knob (the actor accepts an
            // absent maxItems = unbounded; live schema has prefill 1000
            // only — an editor hint, NOT a server default) — WE require
            // it: the estimate must be deducible to price the hold
            // (D24/D25). No extra .min(1) floor: the actor documents
            // absent = unbounded, but publishes no 0-sentinel. v1 declared
            // NO estimation label here (fell back to a constant); the
            // actor's own docs make maxItems the total-output cap, so it
            // IS the limiting knob.
            body: zTiktokScraperBody.required({ maxItems: true }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            // the actor's charge-event this leaf line joins to
            vendor: "apify-default-dataset-item",
            // survey-pinned GOLD-tier event price
            consumes: { credit: "default", amount: 0.0003 },
        },
        /** maxItems caps the total run output — required at the binding,
         *  so the estimate is pure arithmetic (D24). */
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.maxItems },
        }),
    },
});
