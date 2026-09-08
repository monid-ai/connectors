import { z } from "zod";

/**
 * practicaltools/apify-reddit-api — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/practicaltools~apify-reddit-api/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zApifyRedditApiBody = z.object({
    "startUrls": z.array(z.object({
        "url": z.string().describe("A valid Reddit URL."),
    })).describe(
        "Reddit URLs to scrape directly. Supports three URL types: • Subreddit (e.g. reddit.com/r/python/) — scrapes the subreddit feed • Post (e.g. reddit.com/r/python/comments/abc123/) — fetches that post and its comments • User (e.g. reddit.com/user/someuser/) — fetches the user profile and their recen...",
    ).optional(),
    "searches": z.array(z.string()).describe(
        "Keywords or phrases to search for on Reddit. Each query runs independently and returns up to Max Items results. Tip: wrap a query in quotes for exact phrase matching — e.g. '\"web scraping\"' will only match that exact phrase, while 'web scraping' matches posts containing both words anywhere. What ...",
    ).optional(),
    "sort": z.enum([
        "relevance",
        "hot",
        "new",
        "top",
        "comments",
        "controversial",
        "rising",
    ]).describe(
        "How to order results. For search queries: relevance (default) gives the best matches; new/top/hot/comments also work. For subreddit feeds: hot/new/top/controversial/rising. If you pick 'relevance' with a subreddit feed, it falls back to hot. relevance and comments are only valid for searches, not...",
    ).optional(),
    "time": z.enum(["all", "day", "hour", "month", "week", "year"]).describe(
        "Limits results to posts created within the selected time window. Applies to both subreddit feeds and search queries. Use 'all' to include posts from any time.",
    ).optional(),
    "maxItems": z.number().int().min(1).max(100).describe(
        "Maximum number of results per job. Each search query, subreddit, or URL counts as a separate job, so total output can exceed this number when you have multiple inputs. Example: 2 search queries × maxItems 25 = up to 50 posts total.",
    ).optional(),
    "includeNSFW": z.boolean().describe(
        "Include NSFW (Not Safe For Work) content.",
    ).optional(),
    "skipComments": z.boolean().describe(
        "When scraping a direct post URL, comments are fetched by default. Enable this to get only the post metadata without its comments. Does not affect the 'Fetch Comments for Each Post' option.",
    ).optional(),
    "skipUserPosts": z.boolean().describe(
        "When scraping a user profile, recent posts are fetched by default alongside profile info. Enable this to get only the profile metadata.",
    ).optional(),
    "skipCommunity": z.boolean().describe(
        "When scraping a subreddit feed, community metadata (member count, description, etc.) is fetched alongside posts. Enable this to skip that extra request and get only posts.",
    ).optional(),
    "ignorestartUrls": z.boolean().describe(
        "Forces search-only mode — Start URLs are ignored even if provided. Useful if you have URLs saved in your input but want to run a search-only job without deleting them.",
    ).optional(),
    "searchPosts": z.boolean().describe(
        "Find posts matching the search keyword. Returns post objects with title, body, upvotes, and comment count. On by default — disable if you only want comments, communities, or users.",
    ).optional(),
    "searchComments": z.boolean().describe(
        "Find comments matching the search keyword. Works by fetching posts that match the keyword and then filtering their comments — this uses more API calls than post search.",
    ).optional(),
    "fetchPostComments": z.boolean().describe(
        "When enabled, each post returned from a subreddit or keyword search will include a 'comments' array with its top-level comments. Significantly increases API usage — one extra request per post.",
    ).optional(),
    "searchCommunities": z.boolean().describe(
        "Find subreddits whose name or description matches the keyword. Returns community objects with member count, description, and URL.",
    ).optional(),
    "searchUsers": z.boolean().describe(
        "Find Reddit user accounts matching the keyword. Returns user objects with karma, profile info, and account age.",
    ).optional(),
});
