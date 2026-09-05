import { z } from "zod";

/**
 * apify/facebook-groups-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/apify~facebook-groups-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zFacebookGroupsScraperBody = z.object({
    "startUrls": z.array(z.any()).describe(
        "Insert a URL of a valid Facebook group. Only public Facebook groups can be scraped.",
    ),
    "resultsLimit": z.number().int().min(1).describe(
        "Select the number of posts you want to scrape. If this limit is not set, as many results as possible will be returned.",
    ).optional(),
    "viewOption": z.enum([
        "CHRONOLOGICAL",
        "RECENT_ACTIVITY",
        "TOP_POSTS",
        "CHRONOLOGICAL_LISTINGS",
    ]).describe(
        "Select sorting order by which the posts should be scraped. Please note that the Number of results field will be applied to New posts only. The BuySell items sorting will return results for BuySell groups only.",
    ).optional(),
    "searchGroupKeyword": z.string().describe(
        "Without logging in, search results are VERY limited, so searching by word will return nothing in most cases. To get more messages, it is recommended to use a one or two letter search and change the year.",
    ).optional(),
    "searchGroupYear": z.string().describe(
        "The scraper will extract Facebook posts by this year. To use this field, you need to fill in the Search by letter field above ↑.",
    ).optional(),
    "onlyPostsNewerThan": z.string().describe(
        "Scrapes post from the provided date to the present day. The date should be in YYYY-MM-DD or full ISO absolute format or in relative format e.g. 1 days, 2 months, 3 years. The JSON input also supports adding time units (UTC timezone): Full or partial ISO timestamp (e.g., `2025-09-23T10:02:01`) as ...",
    ).optional(),
});
