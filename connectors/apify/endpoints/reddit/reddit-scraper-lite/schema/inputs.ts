import { z } from "zod";

/**
 * trudax/reddit-scraper-lite — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/trudax~reddit-scraper-lite/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zRedditScraperLiteBody = z.object({
    "startUrls": z.array(z.any()).describe(
        "If you already have URL(s) of page(s) you wish to scrape, you can set them here. If you want to use the search field below, remove all startUrls here.",
    ).optional(),
    "skipComments": z.boolean().describe(
        "This will skip scrapping comments when going through posts",
    ).optional(),
    "skipUserPosts": z.boolean().describe(
        "This will skip scrapping user posts when going through user activity",
    ).optional(),
    "skipCommunity": z.boolean().describe(
        "This will skip scrapping community info but will still get community posts if they were not skipped.",
    ).optional(),
    "includeMediaLinks": z.boolean().describe(
        "This will include upVotes, upVoteRatio, imageUrls, videoUrls, and numberOfComments when scraping posts. Enabling this will use a more detailed extraction method, which may affect performance.",
    ).optional(),
    "searches": z.array(z.any()).describe(
        "Here you can provide a search query which will be used to search Reddit`s topics.",
    ).optional(),
    "searchCommunityName": z.string().describe(
        "If provided, the search will be performed only inside this community (e.g., 'programming').",
    ).optional(),
    "ignoreStartUrls": z.boolean().describe(
        "Mainly used as a fix for ignoring starUrl on Zapier",
    ).optional(),
    "searchPosts": z.boolean().describe(
        "Will search for posts with the provided search",
    ).optional(),
    "searchComments": z.boolean().describe(
        "Will search for comments with the provided search",
    ).optional(),
    "searchCommunities": z.boolean().describe(
        "Will search for communities with the provided search",
    ).optional(),
    "searchUsers": z.boolean().describe(
        "Will search for users with the provided search",
    ).optional(),
    "searchMedia": z.boolean().describe(
        "Will search for media with the provided search",
    ).optional(),
    "sort": z.enum(["", "relevance", "hot", "top", "new", "rising", "comments"])
        .describe("Sort search by Relevance, Hot, Top, New or Comments")
        .optional(),
    "time": z.enum(["all", "hour", "day", "week", "month", "year"]).describe(
        "Filter posts by last hour, week, day, month or year",
    ).optional(),
    "includeNSFW": z.boolean().describe(
        "You can choose to include or exclude NSFW content from your search",
    ).optional(),
    "maxItems": z.number().int().describe(
        "The maximum number of items that will be saved in the dataset. If you are scrapping for Communities&Users, remember to consider that each category inside a community is saved as a separated item.",
    ).optional(),
    "maxPostCount": z.number().int().describe(
        "The maximum number of posts that will be scraped for each Posts Page or Communities&Users URL",
    ).optional(),
    "postDateLimit": z.string().describe(
        "Use this value to only retrieve posts published after a specific date.",
    ).optional(),
    "commentDateLimit": z.string().describe(
        "Use this value to only retrieve comments published after a specific date inside a post.",
    ).optional(),
    "maxComments": z.number().int().describe(
        "The maximum number of comments that will be scraped for each Comments Page. If you don't want to scrape comments you can set this to zero.",
    ).optional(),
    "maxCommunitiesCount": z.number().int().describe(
        "The maximum number of `Communities`'s pages that will be scraped if your search or startUrl is a Communities type.",
    ).optional(),
    "maxUserCount": z.number().int().describe(
        "The maximum number of `Users`'s pages that will be scraped.",
    ).optional(),
    "scrollTimeout": z.number().int().describe(
        "Set the timeout in seconds in which the page will stop scrolling down to load new items",
    ).optional(),
    "navigationTimeout": z.number().int().min(20).max(60).describe(
        "Set the navigation timeout in seconds for page loading",
    ).optional(),
    "proxy": z.record(z.string(), z.any()).describe(
        "Either use Apify proxy, or provide your own proxy servers.",
    ).optional(),
    "debugMode": z.boolean().describe("Activate to see detailed logs")
        .optional(),
});
