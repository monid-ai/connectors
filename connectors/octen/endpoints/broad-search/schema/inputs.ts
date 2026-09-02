import { z } from "zod";
import { zWebSearchOptions } from "../../../schema/search-options.ts";

/** Octen /broad-search body (ported from v1). */
export const zOctenBroadSearchBody = z.object({
    query: z.string().min(1).max(500).describe("The original search query."),
    max_queries: z.number().int().min(1).max(30).default(5).describe(
        "Upper bound on the number of sub-queries generated (each executed " +
            "sub-query is a billed search unit).",
    ),
    search_options: zWebSearchOptions.optional().describe(
        "Search options applied to each sub-query (same parameters and " +
            "defaults as Web Search).",
    ),
}).strict();
