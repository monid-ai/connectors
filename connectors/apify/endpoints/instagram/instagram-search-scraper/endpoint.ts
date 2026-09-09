import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstagramSearchScraperBody } from "./schema/inputs.ts";

/**
 * apify/instagram-search-scraper — Search Instagram. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Instagram",
        summary: "Search Instagram for places, profiles, and hashtags by " +
            "keyword.",
        description: "Searches Instagram for places, profiles, and hashtags " +
            "by keyword using discovery sources (Google, Facebook " +
            "Ads, Threads). Returns place metadata (business name, " +
            "category, contact info, address, geocoordinates, " +
            "opening hours), account metadata (username, bio, " +
            "follower/following counts, verification status), " +
            "hashtag metadata (total posts, posts-per-day, " +
            "difficulty, related hashtags), and recent media samples " +
            "with engagement metrics. Suited for finding new places, " +
            "users, trends, and hashtags.",
        docsUrl: "https://apify.com/apify/instagram-search-scraper",
        categories: ["instagram"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/apify/instagram-search-scraper",
    request: {
        method: "POST",
        path: "/v2/acts/apify~instagram-search-scraper/runs",
    },
    input: { schema: { body: zInstagramSearchScraperBody } },
    usage: {
        model: { kind: UsageModelKind.PER_UNIT, unit: Unit.RESULT },
        /** searchLimit × comma-separated `search` TERMS (the actor treats
         *  "a,b,c" as three searches — PR #2 finding; the actor publishes
         *  no searchLimit server default, so absent stays a conservative
         *  in-fn fallback rather than a schema default). */
        estimate: ({ data }) => {
            const body = data.input.body;
            const limit = body.searchLimit ?? 3;
            const terms = body.search
                .split(",").filter((t) => t.trim() !== "").length;
            return { counts: { "RESULT": limit * Math.max(terms, 1) } };
        },
    },
});
