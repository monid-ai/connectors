import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zInstagramSearchScraperBody } from "./schema/inputs.ts";

/**
 * apify/instagram-search-scraper — Search Instagram. Pure data; the async machinery
 * (lifecycle + fromError + usage.evidence + usage.consolidate) is
 * inherited leaf-wise from
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
    input: {
        schema: {
            // searchLimit is the PRIMARY limiting knob (the actor accepts
            // an absent searchLimit; live schema has prefill 1 only — an
            // editor hint, NOT a server default) — WE require it: the
            // estimate must be deducible to price the hold (D24/D25).
            // search stays the plain actor-required mirror — a string with
            // zero non-empty comma-separated terms is a genuine zero-item
            // promise, not an error.
            body: zInstagramSearchScraperBody.required({ searchLimit: true }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            // the actor's charge-event this leaf line joins to
            vendor: "result",
            // survey-pinned GOLD-tier event price
            consumes: { credit: "default", amount: 0.0015 },
        },
        /** searchLimit (required at the binding) × comma-separated
         *  `search` TERMS (the actor treats "a,b,c" as three searches —
         *  PR #2 finding). Zero non-empty terms ⇒ estimate 0 — pure
         *  arithmetic (D24). */
        estimate: ({ data }) => {
            const body = data.input.body;
            const terms = body.search
                .split(",").filter((t) => t.trim() !== "").length;
            return { counts: { "RESULT": body.searchLimit * terms } };
        },
    },
});
