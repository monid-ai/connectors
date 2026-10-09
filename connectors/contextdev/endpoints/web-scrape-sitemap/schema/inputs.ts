import { z } from "zod";
import { zDomain, zZdr } from "../../../schema/common.ts";

/** GET /web/scrape/sitemap query params — the vendor mirror
 *  (docs.context.dev/api-reference/web-scraping/sitemap, 2026-09-17),
 *  scalar params only (design D6). */
export const zScrapeSitemapQueryParams = z.object({
    domain: zDomain,
    includeSubdomains: z.boolean().describe(
        "Also discover public pages and sitemaps on subdomains of the " +
            "domain. Default false.",
    ).optional(),
    maxLinks: z.number().int().min(1).max(100000).describe(
        "Maximum number of links to return. Default 10000, max 100000.",
    ).optional(),
    sitemapUrl: z.string().regex(/^https?:\/\/\S+$/).describe(
        "Explicit sitemap URL. When provided, exactly this sitemap is " +
            "crawled instead of discovering the domain's sitemaps.",
    ).optional(),
    urlRegex: z.string().max(256).describe(
        "RE2-compatible pattern. Only matching URLs are returned and " +
            "counted against maxLinks.",
    ).optional(),
    search: z.string().min(2).max(200).describe(
        "Search phrase: the discovered URLs are filtered to the pages about " +
            "it, most relevant first. A searched crawl costs 2 credits " +
            "instead of 1.",
    ).optional(),
    zdr: zZdr.optional(),
}).strict();
