import { z } from "zod";

/**
 * Shared request mirrors for Search1API (the OpenAPI object bodies,
 * optionality only — D25).
 *
 * The vendor's enums include a literal `""` entry: the documented spelling
 * of "use the default backend". Mirrored faithfully — omitting the field
 * does the same thing.
 */

/** Search engines accepted by `/search` ("" = vendor default). */
export const zSearchService = z.enum([
    "",
    "google",
    "bing",
    "bingcn",
    "duckduckgo",
    "yahoo",
    "yandex",
    "youtube",
    "x",
    "reddit",
    "github",
    "arxiv",
    "wechat",
    "bilibili",
    "imdb",
    "wikipedia",
    "baidu",
    "360",
    "quark",
]);

/** News engines accepted by `/news` ("" = vendor default). */
export const zNewsService = z.enum([
    "",
    "google",
    "bing",
    "duckduckgo",
    "yahoo",
    "hackernews",
    "reuters",
]);

/** Freshness window shared by `/search` and `/news` ("" = no filter). */
export const zTimeRange = z.enum(["", "day", "week", "month", "year"]);

/** The fields `/search` and `/news` share verbatim. */
export const zSearchCommon = {
    query: z.string().min(1).describe("The search query."),
    max_results: z.number().int().min(1).max(50).optional().describe(
        "Maximum results to return (vendor default 5, cap 50).",
    ),
    crawl_results: z.number().int().min(0).max(50).optional().describe(
        "Retrieve full page content for this many top results in the " +
            "same call (vendor default 0).",
    ),
    image: z.boolean().optional().describe(
        "Also return matching image URLs (vendor default false).",
    ),
    include_sites: z.array(z.string()).optional().describe(
        "Only return results from these domains.",
    ),
    exclude_sites: z.array(z.string()).optional().describe(
        "Exclude results from these domains.",
    ),
    language: z.string().optional().describe(
        "Result language hint (e.g. 'en', 'zh').",
    ),
    time_range: zTimeRange.optional().describe(
        "Freshness window: 'day', 'week', 'month', or 'year'.",
    ),
};
