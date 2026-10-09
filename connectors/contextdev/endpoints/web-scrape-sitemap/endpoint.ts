import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zScrapeSitemapQueryParams } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Crawl Sitemap",
        summary: "Discover every URL in a website's sitemap.",
        description: "Enumerate a site's URLs from its sitemaps so a " +
            "crawler, index, or enrichment job starts with complete " +
            "coverage. Sitemaps are discovered from the domain " +
            "automatically (subdomains optional), or a single sitemap URL " +
            "can be crawled explicitly. An RE2 pattern filters which URLs " +
            "are returned (and counted against maxLinks), and a search " +
            "phrase narrows the list to the pages about a topic, most " +
            "relevant first — so a section of a large site can be listed " +
            "cheaply before any page is scraped.",
        docsUrl: "https://docs.context.dev/api-reference/web-scraping/sitemap",
        categories: ["web-extraction"],
        notes: [
            "A crawl with the 'search' filter costs 2 credits instead " +
            "of 1.",
        ],
    },
    request: { method: "GET", path: "/web/scrape/sitemap" },
    input: { schema: { queryParams: zScrapeSitemapQueryParams } },
    usage: {
        /** 1 credit per call, 2 with a search phrase —
         *  https://www.context.dev/pricing (2026-09-17). The surcharge is
         *  its own line, keyed from the REQUEST (design D5): the flat
         *  crawl plus one credit when `search` is present. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                crawl: {
                    kind: UsageModelKind.PER_CALL,
                    label: "base fee",
                    consumes: { credit: "default", amount: 1 },
                },
                search_surcharge: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.CREDIT,
                    label: "search surcharge",
                    description: "the extra credit a search phrase adds",
                    consumes: { credit: "default", amount: 1 },
                },
            },
        },
        estimate: ({ data }) => ({
            counts: {
                search_surcharge: data.input.queryParams.search !== undefined
                    ? 1
                    : 0,
            },
        }),
        evidence: ({ data, utils }) => ({
            counts: {
                search_surcharge: utils.json.optionalGet(
                        data.input.queryParams ?? {},
                        "$.search",
                    ) !== undefined
                    ? 1
                    : 0,
            },
        }),
    },
});
