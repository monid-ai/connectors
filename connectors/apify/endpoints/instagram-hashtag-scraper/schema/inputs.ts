import { z } from "zod";

/**
 * apify/instagram-hashtag-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/apify~instagram-hashtag-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zInstagramHashtagScraperBody = z.object({
    "hashtags": z.array(z.string()).describe(
        "Type in or paste the hashtag with or without # symbol. ⚠️ Each hashtag is treated as one single search term. If you put several words in one line (e.g. travel photography food), they'll be merged into a single hashtag (#travelphotographyfood). To search for terms separately, add each one as its o...",
    ),
    "keywordSearch": z.boolean().describe(
        "Enable this option if you want to get posts or reels by a specific keyword instead of a hashtag. Add your keywords to the Hashtags or keywords field above. Unlike with hashtags, multiple words are supported as keywords, just add spaces between them. The dataset will be slightly different than the...",
    ).optional(),
    "resultsType": z.enum(["posts", "reels", "stories"]).describe(
        "Choose whether to scrape posts or reels for the selected hashtags or keywords.",
    ).optional(),
    "resultsLimit": z.number().int().min(1).describe(
        "Set the maximum number of results (reels or posts) you want to scrape. If you set this to 5, you will scrape 5 posts for each hashtag or keyword you provide. With this setup, if you decide to add 7 different hashtags or keywords, you will scrape 35 posts altogether.⚠️ Free usage covers just the f...",
    ).optional(),
});
