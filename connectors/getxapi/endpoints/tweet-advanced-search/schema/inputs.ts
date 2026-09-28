import { z } from "zod";
import { zCursor } from "../../../schema/common.ts";

/** GET /tweet/advanced_search query params (docs.getxapi.com/docs/tweets/advanced-search,
 *  public OpenAPI 3.1, read 2026-09-23). */
export const zTweetAdvancedSearchQueryParams = z.object({
    q: z.string().min(1).describe(
        "Search query. Supports X advanced-search operators, for example 'from:nasa -filter:replies min_faves:100'.",
    ),
    product: z.enum(["Latest", "Top"]).describe(
        "Result order: 'Latest' for newest first (the default), 'Top' for X's relevance ranking.",
    ).optional(),
    cursor: zCursor.optional(),
}).strict();
