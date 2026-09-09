import { defineEndpoint, presets, Unit, UsageModelKind } from "@shared/core";
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
    request: {
        method: "POST",
        path: "/v2/acts/apify~instagram-api-scraper/runs",
    },
    input: { schema: { body: zInstagramApiScraperBody } },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey
            // — caught by `deno task apify:pricing` on first run)
            kind: UsageModelKind.COMPOSITE,
            // component ids = the actor's charge-event names, VERBATIM
            // (live survey) — the broker card row key and the join key for
            // the stashed run-record rates (design D19)
            components: {
                "actor-start": { kind: UsageModelKind.PER_CALL },
                "result": { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
            },
        },
        /** resultsLimit posts per direct url (searchLimit in search mode) — the endpoint's OWN pinned input fields
         *  (no probing: the schema is the source of truth). */
        /** resultsLimit (direct-url runs) or searchLimit (search runs) —
         *  TWO alternative limit knobs, so an inline fn (presets take
         *  single fields — D19 addendum); × directUrls. */
        estimate: ({ data, utils }) => {
            const body = data.input.body ?? null;
            const limit = utils.json.optionalNum(body, "$.resultsLimit") ??
                utils.json.optionalNum(body, "$.searchLimit");
            if (limit === undefined) return { counts: { "result": 3 } };
            const urls = utils.json.optionalGet(body, "$.directUrls");
            const n = Math.max(Array.isArray(urls) ? urls.length : 0, 1);
            return { counts: { "result": limit * n } };
        },
    },
});
