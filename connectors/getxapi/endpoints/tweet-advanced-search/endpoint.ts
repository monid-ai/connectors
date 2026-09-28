import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTweetAdvancedSearchQueryParams } from "./schema/inputs.ts";

/** GET /tweet/advanced_search: Search X (Twitter) Posts. $0.001 per call (getxapi.com/pricing). */
export default defineEndpoint({
    meta: {
        displayName: "Search X (Twitter) Posts",
        summary:
            "Search tweets with X's advanced-search operators, newest or " +
            "top first.",
        description:
            "Full-text tweet search with X's own advanced-search syntax in " +
            '`q`: `from:`, `to:`, `@mention`, `#hashtag`, `"exact phrase"`, ' +
            "`OR`, `-exclude`, `lang:`, `since:` / `until:` dates, " +
            "`min_faves:` / `min_retweets:` / `min_replies:`, " +
            "`filter:media` / `filter:links` / `-filter:replies`, and " +
            "`conversation_id:`. `product` picks `Latest` (reverse " +
            "chronological, the default) or `Top` (X's relevance ranking). " +
            "Returns about 20 tweets per call, each with the author " +
            "profile, engagement counts, media, and quoted or replied-to " +
            "context. For one account's own timeline, use " +
            "`getxapi#user/tweets` instead; for replies to one tweet, " +
            "`getxapi#tweet/replies`.",
        docsUrl: "https://docs.getxapi.com/docs/tweets/advanced-search",
        categories: ["twitter"],
        notes: [
            "`Top` results are not strictly time-ordered and may repeat " +
            "across pages; use `Latest` with `since:` / `until:` in `q` for " +
            "complete, time-bounded collection.",
        ],
    },
    request: { method: "GET", path: "/tweet/advanced_search" },
    input: { schema: { queryParams: zTweetAdvancedSearchQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "search page",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
