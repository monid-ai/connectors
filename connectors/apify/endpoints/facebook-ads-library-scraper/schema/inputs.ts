import { z } from "zod";

/**
 * curious_coder/facebook-ads-library-scraper — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/curious_coder~facebook-ads-library-scraper/builds/default →
 * actorDefinition.input) on 2026-09-05 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the live-gated
 * schema-drift test flags divergence). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zFacebookAdsLibraryScraperBody = z.object({
    "urls": z.array(z.any()).describe(
        "List of facebook ads search URLs or Page URLs to scrape ads from",
    ),
    "scrapeAdDetails": z.boolean().describe(
        "Enable this option to scrape ads details such as EU Reach info",
    ).optional(),
    "limitPerSource": z.number().int().describe(
        "Limit number of ads scraped per input URL. Leave it blank to scrape all available ads ℹ️ Actual number might exceed the given limit by upto 30",
    ).optional(),
    "count": z.number().int().describe(
        "Leave this field empty if you want to limit number of ads scraped",
    ).optional(),
    "scrapePageAds.period": z.enum([
        "",
        "last24h",
        "last7d",
        "last14d",
        "last30d",
    ]).describe("Search ads in given date range").optional(),
    "scrapePageAds.activeStatus": z.enum(["all", "active", "inactive"])
        .optional(),
    "scrapePageAds.sortBy": z.enum(["impressions_desc", "most_recent"])
        .describe("Sort by impressions or date. Default: Impressions")
        .optional(),
    "scrapePageAds.countryCode": z.string().describe(
        "2-letter ISO country code (ISO 3166-1 alpha-2). This should be the official uppercase country code, such as `IN` for India, `US` for United States, etc. Use `ALL` for targeting all countries",
    ).optional(),
    "runTag": z.string().describe(
        "Add this value to 'runTag' column in the output",
    ).optional(),
    "proxy": z.record(z.string(), z.any()).describe(
        "You can use this option to customise the proxy country",
    ).optional(),
});
