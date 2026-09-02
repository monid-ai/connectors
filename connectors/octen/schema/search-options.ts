import { z } from "zod";

/**
 * Shared search-option fragments for the Octen search family (ported from
 * v1 endpoints/common.ts). `/search` FLATTENS these fields into its body;
 * `/broad-search` nests them as `search_options`.
 */

/** Highlight extraction controls (search family). */
export const zHighlightOptions = z.object({
    enable: z.boolean().default(true).describe(
        "If true, returns query-relevant highlight in each result.",
    ),
    max_tokens: z.number().int().min(100).max(20000).default(512).describe(
        "Max tokens returned per highlight.",
    ),
}).strict();

/** Full raw page content controls (search family). */
export const zFullContentOptions = z.object({
    enable: z.boolean().default(false).describe(
        "If true, returns full_content for each result.",
    ),
    max_tokens: z.number().int().min(100).max(100000).default(2048).describe(
        "Maximum tokens of full content included per result.",
    ),
}).strict();

/** Relative time window, counted back from now. */
export const zTimeRange = z.enum([
    "day",
    "week",
    "month",
    "year",
    "d",
    "w",
    "m",
    "y",
]);

export const webSearchOptionFields = {
    topic: z.enum(["general", "news"]).default("general").describe(
        "Use 'general' for general web search, or 'news' for news-focused " +
            "results.",
    ),
    count: z.number().int().min(1).max(100).default(5).describe(
        "Number of results to return (1-100).",
    ),
    include_domains: z.array(z.string().max(60)).max(1200).optional()
        .describe("Domains to specifically include in the search results."),
    exclude_domains: z.array(z.string().max(60)).max(1200).optional()
        .describe("Domains to specifically exclude from the search results."),
    include_text: z.array(z.string().max(30)).max(5).optional().describe(
        "Strings that must appear in the result page text.",
    ),
    exclude_text: z.array(z.string().max(30)).max(5).optional().describe(
        "Strings that must not appear in the result page text.",
    ),
    time_basis: z.enum(["auto", "published", "crawled"]).default("auto")
        .describe("Which time field is used for time filtering."),
    time_range: zTimeRange.optional().describe(
        "Relative time window counting back from now. Mutually exclusive " +
            "with start_time/end_time (which take precedence).",
    ),
    start_time: z.string().optional().describe(
        "Start time for filtering results. ISO 8601 format.",
    ),
    end_time: z.string().optional().describe(
        "End time for filtering results. ISO 8601 format.",
    ),
    country: z.string().optional().describe(
        "ISO 3166 country to prioritize results from; default 'auto' " +
            "infers it from the query.",
    ),
    highlight: zHighlightOptions.optional(),
    format: z.enum(["markdown", "text"]).default("text").describe(
        "Formatting of highlight outputs.",
    ),
    safesearch: z.enum(["off", "strict"]).default("strict").describe(
        "Explicit/adult content filtering.",
    ),
    full_content: zFullContentOptions.optional(),
    include_images: z.boolean().default(false).describe(
        "Whether to include images in each result.",
    ),
};

export const zWebSearchOptions = z.object(webSearchOptionFields).strict();
