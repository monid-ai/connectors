import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLinkedinPostSearchBody } from "./schema/inputs.ts";

/**
 * harvestapi/linkedin-post-search — Search LinkedIn Posts. Pure data; the async machinery
 * (lifecycle + fromError + usage.consolidate) is inherited leaf-wise from
 * the apify provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search LinkedIn Posts",
        summary: "Search LinkedIn posts by text query with author and " +
            "company filters.",
        description: "Searches LinkedIn posts by text queries with optional " +
            "author/company filters \u2014 no cookies or account " +
            "required. Returns full post content, author " +
            "information, timestamps, engagement metrics (likes, " +
            "reactions, comments, shares, reaction-type breakdowns), " +
            "media (images, videos, links), and repost content. " +
            "Supports Boolean search, time-range and " +
            "sort-by-date/relevance options, and optional nested " +
            "reactions and comments per post.",
        docsUrl: "https://apify.com/harvestapi/linkedin-post-search",
        categories: ["linkedin"],
    },
    /** PUBLIC identity: the actor's own slug path (design D22) —
     *  mechanically derived from request.path, pinned for readability. */
    endpoint: "/harvestapi/linkedin-post-search",
    request: {
        method: "POST",
        path: "/v2/acts/harvestapi~linkedin-post-search/runs",
    },
    input: {
        schema: {
            // the actor accepts an absent maxPosts (prefill 20 is
            // editor-only, NOT a server default) and reads 0 as "scrape ALL
            // posts"; it also accepts absent searchQueries — WE require
            // maxPosts ≥ 1 and a non-empty searchQueries (the per-query
            // multiplier, v1 PER_QUERY_LIMIT): the estimate must be
            // deducible to price the hold (D24)
            body: zLinkedinPostSearchBody.extend({
                "maxPosts": zLinkedinPostSearchBody.shape.maxPosts
                    .unwrap().min(1),
                "searchQueries": zLinkedinPostSearchBody.shape.searchQueries
                    .unwrap().min(1),
            }),
        },
    },
    usage: {
        model: {
            // verified actor-start charge event + per-item metering (survey)
            kind: UsageModelKind.COMPOSITE,
            // component ids = the actor's charge-event names, VERBATIM
            // (live survey) — the broker card row key and the join key for
            // the stashed run-record rates (design D19)
            components: {
                "apify-actor-start": {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                },
                "post": {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "posts",
                },
            },
        },
        /** maxPosts per search query — both required at the binding, so the
         *  estimate is pure arithmetic (D24). */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    "post": body.maxPosts * body.searchQueries.length,
                },
            };
        },
    },
});
