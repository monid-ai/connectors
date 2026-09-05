import { defineEndpoint } from "@shared/core";
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
    request: {
        method: "POST",
        path: "/v2/acts/harvestapi~linkedin-post-search/runs",
    },
    input: { schema: { body: zLinkedinPostSearchBody } },
});
