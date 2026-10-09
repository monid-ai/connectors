import { z } from "zod";
import { playgroundOptionFields, zAnyPageUrl } from "../../../schema/common.ts";

/** The playground `map` agent's input
 *  (docs.mrscraper.com/docs/api/playground/scrape-sitemap, 2026-09-17);
 *  options lifted to the query by `toRequest`, the agent pinned there
 *  (design D2). `retry` / `tokenCap` are not carried. */
export const zScrapeMapBody = z.object({
    url: zAnyPageUrl,
    maxDepth: z.number().int().min(1).describe(
        "Maximum crawl depth from the starting URL.",
    ).optional(),
    maxPages: z.number().int().min(1).max(20).describe(
        "Maximum pages to crawl (1-20).",
    ).optional(),
    limit: z.number().int().min(1).describe(
        "Maximum number of URLs to collect.",
    ).optional(),
    includePatterns: z.array(z.string().min(1)).describe(
        "Only URLs matching these patterns are crawled, one pattern per " +
            "entry (e.g. 'https://example.com/blog/*').",
    ).optional(),
    excludePatterns: z.array(z.string().min(1)).describe(
        "URLs matching these patterns are skipped, one pattern per entry.",
    ).optional(),
    geoCode: playgroundOptionFields.geoCode.optional(),
    proxyCountry: playgroundOptionFields.proxyCountry.optional(),
    timeout: playgroundOptionFields.timeout.optional(),
    super: playgroundOptionFields.super.optional(),
}).strict();
