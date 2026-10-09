import { z } from "zod";

/** GET /duckduckgo/search query params (litescrape.com/docs/duckduckgo-search, 2026-09-20). */
export const zDuckDuckGoSearchQueryParams = z.object({
    q: z.string().min(1).max(500).describe(
        "Search text, up to 500 characters.",
    ),
    kl: z.string().regex(/^[a-z]{2}-[a-z]{2}$/).describe(
        "Region and language token such as 'us-en'.",
    ).optional(),
    search_assist: z.boolean().describe(
        "DuckDuckGo query assistance. Cannot be combined with m. Default true.",
    ).optional(),
    safe: z.enum(["1", "-1", "-2"]).describe(
        "Safe-search level: '1' strict, '-1' moderate, '-2' off. Default '-1'.",
    ).optional(),
    df: z.string().regex(/^([dwmy]|\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2})$/)
        .describe(
            "Date window: d, w, m, y, or 'YYYY-MM-DD..YYYY-MM-DD'.",
        ).optional(),
    start: z.number().int().min(0).max(10000).describe(
        "Result offset, 0-10,000. Default 0.",
    ).optional(),
    m: z.number().int().min(1).max(50).describe(
        "Number of results, 1-50. Cannot be combined with search_assist. Default 50.",
    ).optional(),
}).strict();
