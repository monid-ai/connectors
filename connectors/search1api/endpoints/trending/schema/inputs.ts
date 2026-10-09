import { z } from "zod";

/**
 * `POST /trending` request body. The OpenAPI declares `search_service` as
 * a free string, but the vendor's own docs and SDK enumerate exactly two
 * sources — the enum is the honest mirror of what answers 200.
 */
export const zTrendingBody = z.object({
    search_service: z.enum(["github", "hackernews"]).describe(
        "Trending source: 'github' repositories or 'hackernews' stories.",
    ),
    max_results: z.number().int().min(1).optional().describe(
        "Maximum trending items to return.",
    ),
}).strict();
